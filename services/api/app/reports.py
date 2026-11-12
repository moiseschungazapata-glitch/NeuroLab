"""Authorized PDF reports assembled from a bounded project snapshot."""
from io import BytesIO
from html import escape
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .training_routes import service

router = APIRouter(prefix='/api/v1')


class ProjectReport(BaseModel):
    id: int
    name: str = Field(min_length=1, max_length=70)
    description: str = Field(max_length=500)
    family: str = Field(max_length=30)
    status: str = Field(max_length=30)
    documentation: str = Field(default='', max_length=12000)
    tags: list[str] = Field(default_factory=list, max_length=8)


class ArchitectureReport(BaseModel):
    family: str = Field(max_length=30)
    input: list[int] = Field(max_length=3)
    output: str = Field(max_length=100)
    parameters: int = Field(ge=0, le=2_000_000)
    layers: list[dict[str, Any]] = Field(max_length=32)


class TrainingReport(BaseModel):
    id: str = Field(max_length=80)
    source: str = Field(pattern='^(Real|Simulación)$')
    family: str = Field(max_length=30)
    dataset: str = Field(max_length=150)
    state: str = Field(max_length=30)
    createdAt: str | None = Field(default=None, max_length=50)
    endedAt: str | None = Field(default=None, max_length=50)
    epochs: int = Field(ge=0, le=10000)
    batch: int | None = Field(default=None, ge=1, le=100000)
    optimizer: str | None = Field(default=None, max_length=30)
    metrics: dict[str, float] = Field(default_factory=dict)


class ModelReport(BaseModel):
    version: str = Field(max_length=30)
    status: str = Field(max_length=30)
    family: str = Field(max_length=30)
    dataset: str = Field(max_length=150)
    jobId: str = Field(max_length=80)
    artifacts: list[dict[str, Any]] = Field(default_factory=list, max_length=3)


class ReportInput(BaseModel):
    generatedAt: str = Field(max_length=50)
    project: ProjectReport
    architecture: ArchitectureReport
    trainings: list[TrainingReport] = Field(max_length=100)
    models: list[ModelReport] = Field(max_length=50)


def clean(value: Any) -> str:
    return escape(str(value if value not in (None, '') else 'No registrado'))


def metric_text(metrics: dict[str, float]) -> str:
    return ', '.join(f'{key}: {value:.5g}' for key, value in sorted(metrics.items())) or 'Sin métricas finales'


def make_pdf(data: ReportInput) -> bytes:
    stream = BytesIO()
    document = SimpleDocTemplate(stream, pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=22*mm, bottomMargin=18*mm,
                                 title=f'Reporte - {data.project.name}', author='NeuroLab Enterprise')
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='ReportTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=22, leading=27, textColor=colors.HexColor('#17382A'), spaceAfter=12))
    styles.add(ParagraphStyle(name='Section', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=13, leading=17, textColor=colors.HexColor('#245E45'), spaceBefore=12, spaceAfter=8))
    styles.add(ParagraphStyle(name='Small', parent=styles['BodyText'], fontSize=8, leading=11, textColor=colors.HexColor('#66756C')))
    styles.add(ParagraphStyle(name='Footer', parent=styles['BodyText'], fontSize=8, alignment=TA_CENTER, textColor=colors.HexColor('#7B897F')))
    body = [Paragraph('NeuroLab Enterprise', styles['Small']), Paragraph(clean(data.project.name), styles['ReportTitle']),
            Paragraph(f'Reporte generado {clean(data.generatedAt)}', styles['Small']), Spacer(1, 5*mm)]
    body += [Paragraph('Ficha del proyecto', styles['Section']),
             Table([[Paragraph('<b>Estado</b>', styles['Small']), clean(data.project.status), Paragraph('<b>Familia</b>', styles['Small']), clean(data.project.family)],
                    [Paragraph('<b>Descripción</b>', styles['Small']), Paragraph(clean(data.project.description), styles['Small']), Paragraph('<b>Etiquetas</b>', styles['Small']), Paragraph(clean(', '.join(data.project.tags)), styles['Small'])]], colWidths=[25*mm, 55*mm, 25*mm, 55*mm], style=table_style())]
    if data.project.documentation:
        body += [Paragraph('Documentación', styles['Section']), Paragraph(clean(data.project.documentation).replace('\n', '<br/>'), styles['BodyText'])]
    arch = data.architecture
    body += [Paragraph('Resumen de arquitectura', styles['Section']),
             Table([['Familia', 'Entrada', 'Salida', 'Parámetros'], [clean(arch.family), clean(' x '.join(map(str, arch.input))), clean(arch.output), f'{arch.parameters:,}']], colWidths=[35*mm, 40*mm, 45*mm, 40*mm], style=table_style(True))]
    layer_rows = [['#', 'Bloque', 'Unidades', 'Activación', 'Configuración']]
    for index, layer in enumerate(arch.layers, 1):
        configuration = ', '.join(f'{k}: {v}' for k, v in layer.items() if k not in {'id', 'kind', 'units', 'activation'}) or '-'
        layer_rows.append([str(index), clean(layer.get('kind')), clean(layer.get('units')), clean(layer.get('activation')), clean(configuration)])
    body += [Table(layer_rows, repeatRows=1, colWidths=[10*mm, 52*mm, 25*mm, 33*mm, 40*mm], style=table_style(True))]
    body += [PageBreak(), Paragraph('Historial de entrenamiento', styles['Section'])]
    training_rows = [['Ejecución', 'Fuente', 'Familia', 'Dataset', 'Estado', 'Épocas', 'Métricas']]
    for job in data.trainings:
        training_rows.append([clean(job.id[:12]), clean(job.source), clean(job.family), clean(job.dataset), clean(job.state), str(job.epochs), Paragraph(clean(metric_text(job.metrics)), styles['Small'])])
    if len(training_rows) == 1:
        body.append(Paragraph('No hay entrenamientos vinculados a este proyecto.', styles['BodyText']))
    else:
        body.append(Table(training_rows, repeatRows=1, colWidths=[23*mm, 20*mm, 22*mm, 31*mm, 23*mm, 14*mm, 35*mm], style=table_style(True), splitByRow=True))
    body += [Paragraph('Modelos registrados', styles['Section'])]
    model_rows = [['Versión', 'Estado', 'Familia', 'Dataset', 'Ejecución', 'Artefactos']]
    for model in data.models:
        model_rows.append([clean(model.version), clean(model.status), clean(model.family), clean(model.dataset), clean(model.jobId[:12]), clean(', '.join(str(a.get('name', '')) for a in model.artifacts))])
    if len(model_rows) == 1:
        body.append(Paragraph('No hay modelos reales registrados para este proyecto.', styles['BodyText']))
    else:
        body.append(Table(model_rows, repeatRows=1, colWidths=[22*mm, 23*mm, 25*mm, 38*mm, 28*mm, 32*mm], style=table_style(True), splitByRow=True))

    def page(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor('#DCE4D8'))
        canvas.line(18*mm, 13*mm, 192*mm, 13*mm)
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#7B897F'))
        canvas.drawString(18*mm, 8*mm, 'NeuroLab Enterprise - Entorno local')
        canvas.drawRightString(192*mm, 8*mm, f'Página {doc.page}')
        canvas.restoreState()

    document.build(body, onFirstPage=page, onLaterPages=page)
    return stream.getvalue()


def table_style(header=False):
    commands = [('GRID', (0, 0), (-1, -1), .4, colors.HexColor('#DCE4D8')), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'), ('FONTSIZE', (0, 0), (-1, -1), 8), ('LEADING', (0, 0), (-1, -1), 11),
                ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6), ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6)]
    if header:
        commands += [('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EDF3E9')), ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#245E45')), ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold')]
    return TableStyle(commands)


@router.post('/projects/{project_id}/reports/pdf')
def project_pdf(project_id: int, report: ReportInput, request: Request):
    service(request)
    if report.project.id != project_id:
        from fastapi import HTTPException
        raise HTTPException(422, 'El proyecto del reporte no coincide con la ruta.')
    body = make_pdf(report)
    return Response(body, media_type='application/pdf', headers={
        'Content-Disposition': f'attachment; filename="reporte-neurolab-{project_id}.pdf"',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    })
