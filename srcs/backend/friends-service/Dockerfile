FROM docker.io/python:3.11-slim

LABEL service="friends-service"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m -u 1000 -s /bin/bash appuser \
    && mkdir -p  /app/logs \
    && chown -R appuser:appuser /app
	
WORKDIR /app
    
COPY --chown=appuser:appuser ./app /app/app

COPY --chown=appuser:appuser requirements.txt .

USER appuser

RUN pip install --user --no-cache-dir -r requirements.txt

ENV PATH=/home/appuser/.local/bin:$PATH

EXPOSE 8004

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8004", "--ssl-keyfile", "/certs/internal.key", "--ssl-certfile", "/certs/internal.crt"]