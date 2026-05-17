FROM docker.io/python:3.11-slim AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --prefix=/install -r requirements.txt

FROM docker.io/python:3.11-slim

LABEL service="api-gateway"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/* && \
    useradd -m -u 1000 -s /bin/bash appuser && \
    mkdir -p /app/logs && \
    chown -R appuser:appuser /app

COPY --from=builder /install /usr/local

WORKDIR /app
COPY --chown=appuser:appuser ./app /app/app

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:socket_app", "--host", "0.0.0.0", "--port", "8000", "--ssl-keyfile", "/certs/internal.key", "--ssl-certfile", "/certs/internal.crt"]
