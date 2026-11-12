import asyncio
import json
import secrets
import uuid
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from workers.training import store
from .config import ALLOWED_HOSTS, ALLOWED_ORIGINS, normalize_origin
from .training_validation import validate_payload

router = APIRouter(prefix='/api/v1')


def service(request, authenticated=True):
    host = request.headers.get('host', '').lower()
    origin = normalize_origin(request.headers.get('origin', ''))
    cross_site_without_origin = request.headers.get('sec-fetch-site') == 'cross-site' and not origin
    if host not in ALLOWED_HOSTS or cross_site_without_origin or (origin and origin not in ALLOWED_ORIGINS):
        raise HTTPException(403, 'La API de entrenamiento no reconoce este host u origen.')
    engine = getattr(request.app.state, 'training', None)
    if not engine:
        raise HTTPException(503, 'Servicio de entrenamiento no disponible.')
    if authenticated and not secrets.compare_digest(request.headers.get('authorization', ''), 'Bearer '+engine.token):
        raise HTTPException(401, 'Actualiza la sesión local de entrenamiento.')
    return engine


def record(identifier):
    try:
        return store.get(str(uuid.UUID(identifier)))
    except (KeyError, ValueError):
        raise HTTPException(404, 'Trabajo no encontrado.')


def submission(request):
    try:
        return str(uuid.UUID(request.headers.get('idempotency-key', '')))
    except ValueError:
        raise HTTPException(400, 'Falta un identificador único de envío.')


@router.get('/training/session')
def session(request: Request):
    engine = service(request, False)
    return {'token': engine.token, 'engineReady': engine.engine_ready, 'engine': 'TensorFlow CPU', 'limits': {'parameters': 2_000_000, 'values': 1_000_000, 'seconds': 300, 'memoryGiB': 2, 'concurrency': 1, 'pending': 4}}


@router.get('/training-jobs')
def list_jobs(request: Request):
    service(request)
    return store.list_jobs()


@router.post('/projects/{project_id}/training-jobs', status_code=202)
async def create_job(project_id: int, request: Request):
    engine = service(request)
    if not engine.engine_ready:
        raise HTTPException(503, 'TensorFlow no está instalado en el entorno del worker.')
    key = submission(request)
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > 24 * 1024**2:
            raise HTTPException(413, 'El envío preparado supera 24 MiB.')
    try:
        payload = validate_payload(json.loads(body))
        if payload['project']['id'] != project_id:
            raise ValueError('El proyecto del envío no coincide con la ruta.')
        return store.create(payload, submission=key)
    except store.CapacityError as exc:
        raise HTTPException(429, str(exc), headers={'Retry-After': '5'})
    except (ValueError, TypeError, RecursionError) as exc:
        raise HTTPException(422, str(exc) if isinstance(exc, ValueError) else 'Formato de entrenamiento inválido.')


@router.get('/training-jobs/{identifier}')
def get_job(identifier: str, request: Request):
    service(request)
    return record(identifier)


class EvaluationInput(BaseModel):
    observations: str = Field(max_length=4000)
    limitations: str = Field(max_length=4000)
    revision: int = Field(ge=0, strict=True)


class ModelStatusInput(BaseModel):
    status: str = Field(pattern='^(Revisado|Aprobado|Retirado)$')
    revision: int = Field(ge=0, strict=True)


@router.get('/training-jobs/{identifier}/evaluation')
def get_evaluation(identifier: str, request: Request):
    service(request)
    return store.get_evaluation(record(identifier)['id'])


@router.put('/training-jobs/{identifier}/evaluation')
def save_evaluation(identifier: str, evaluation: EvaluationInput, request: Request):
    service(request)
    job = record(identifier)
    try:
        return store.save_evaluation(job['id'], **evaluation.model_dump())
    except store.EvaluationConflict as exc:
        raise HTTPException(409, str(exc))


@router.get('/model-versions')
def list_model_versions(request: Request):
    service(request)
    return store.list_model_versions()


@router.post('/training-jobs/{identifier}/model-version', status_code=201)
def register_model_version(identifier: str, request: Request):
    service(request)
    job = record(identifier)
    try:
        return store.register_model(job['id'])
    except store.RegistryConflict as exc:
        raise HTTPException(409, str(exc))


@router.get('/model-versions/{identifier}/manifest')
def model_manifest(identifier: str, request: Request):
    service(request)
    job = record(identifier)
    try:
        return store.get_model_version(job['id'])
    except KeyError:
        raise HTTPException(404, 'Versión de modelo no encontrada.')


@router.patch('/model-versions/{identifier}/status')
def change_model_status(identifier: str, change: ModelStatusInput, request: Request):
    service(request)
    job = record(identifier)
    try:
        return store.change_model_status(job['id'], change.status, change.revision)
    except KeyError:
        raise HTTPException(404, 'Versión de modelo no encontrada.')
    except store.RegistryConflict as exc:
        raise HTTPException(409, str(exc))


@router.post('/training-jobs/{identifier}/cancel')
def cancel_job(identifier: str, request: Request):
    service(request)
    job = record(identifier)
    try:
        return store.cancel(job['id'])
    except ValueError as exc:
        raise HTTPException(409, str(exc))


@router.post('/training-jobs/{identifier}/retry', status_code=202)
def retry_job(identifier: str, request: Request):
    engine = service(request)
    if not engine.engine_ready:
        raise HTTPException(503, 'TensorFlow no disponible.')
    job = record(identifier)
    if job['state'] not in {'FAILED', 'CANCELLED'}:
        raise HTTPException(409, 'Solo se reintentan trabajos fallidos o cancelados.')
    try:
        return store.create(store.payload(job['id']), parent=job['id'], submission=submission(request))
    except store.CapacityError as exc:
        raise HTTPException(429, str(exc), headers={'Retry-After': '5'})
    except ValueError as exc:
        raise HTTPException(409, str(exc))


@router.get('/training-jobs/{identifier}/events')
async def job_events(identifier: str, request: Request):
    service(request)
    job = record(identifier)
    try:
        cursor = max(0, int(request.headers.get('last-event-id', '0')))
    except ValueError:
        raise HTTPException(400, 'Cursor de eventos inválido.')

    async def stream():
        nonlocal cursor
        heartbeat = 0
        while not await request.is_disconnected():
            events = store.events(job['id'], cursor)
            for event in events:
                cursor = event['eventId']
                yield f'id: {cursor}\nevent: job\ndata: {json.dumps(event, allow_nan=False)}\n\n'
            if store.get(job['id'])['state'] in store.TERMINAL:
                return
            heartbeat += 1
            if heartbeat % 20 == 0:
                yield ': keepalive\n\n'
            await asyncio.sleep(0.5)
    return StreamingResponse(stream(), media_type='text/event-stream', headers={'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no'})


@router.get('/training-jobs/{identifier}/artifacts/{name}')
def artifact(identifier: str, name: str, request: Request):
    service(request)
    job = record(identifier)
    if job['state'] != 'COMPLETED' or name not in ('model.keras', 'generator.keras', 'discriminator.keras') or not any(a['name'] == name for a in job['artifacts']):
        raise HTTPException(404, 'Artefacto no disponible.')
    path = store.directory(job['id']) / name
    if not path.is_file():
        raise HTTPException(404, 'El archivo ya no está disponible en el almacenamiento local.')
    return FileResponse(path, filename=name, media_type='application/octet-stream', headers={'Cache-Control': 'no-store'})
