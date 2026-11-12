"""Runtime configuration shared by the API routes and CORS middleware."""
import os


LOCAL_HOSTS = {
    f"{host}:{port}"
    for host in ("127.0.0.1", "localhost")
    for port in (5173, 4173, 8000)
}
LOCAL_ORIGINS = {f"http://{host}" for host in LOCAL_HOSTS}


def csv_values(name: str) -> set[str]:
    return {
        value.strip()
        for value in os.environ.get(name, "").split(",")
        if value.strip()
    }


def normalize_origin(value: str) -> str:
    return value.strip().rstrip("/").lower()


ALLOWED_HOSTS = LOCAL_HOSTS | {
    value.lower()
    for value in (
        csv_values("NEUROLAB_ALLOWED_HOSTS")
        | csv_values("RAILWAY_PUBLIC_DOMAIN")
    )
}
ALLOWED_ORIGINS = LOCAL_ORIGINS | {
    normalize_origin(value) for value in csv_values("NEUROLAB_ALLOWED_ORIGINS")
}

