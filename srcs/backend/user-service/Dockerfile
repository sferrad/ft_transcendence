FROM python:3.11-slim

LABEL service="user-service"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 -s /bin/bash appuser

WORKDIR /app

USER appuser

COPY --chown=appuser:appuser requirements.txt .

RUN pip install --user --no-cache-dir -r requirements.txt

RUN mkdir -p /app/app /app/logs && \
    chown -R appuser:appuser /app


COPY --chown=appuser:appuser ./app /app/app

ENV PATH=/home/appuser/.local/bin:$PATH

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]