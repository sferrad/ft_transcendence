FROM python:3.11-slim

LABEL service="api-gateway"

# -----------------------------------------------------------------
# ENV PYTHON
# -----------------------------------------------------------------

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# PYTHONUNBUFFERED=1 :
#   - stdout/stderr non bufferisés → logs en temps réel
# PYTHONDONTWRITEBYTECODE=1 :
#   - pas de .pyc/__pycache__ → image plus propre
# PIP_NO_CACHE_DIR=1 :
#   - pip ne garde pas de cache → image plus légère

# -----------------------------------------------------------------
# DÉPENDANCES SYSTÈME
# -----------------------------------------------------------------

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# curl      : utilisé pour healthchecks/debug
# gcc       : nécessaire pour compiler certains paquets Python (psycopg2)
# libpq-dev : headers/bibliothèques PostgreSQL pour psycopg2

# -----------------------------------------------------------------
# UTILISATEUR NON ROOT
# -----------------------------------------------------------------

RUN useradd -m -u 1000 -s /bin/bash appuser

# useradd :
#   - -m : crée /home/appuser
#   - -u 1000 : UID=1000 (classique pour un user non root)
#   - -s /bin/bash : shell bash
#
# On évite de faire tourner l’app en root pour la sécurité.

# -----------------------------------------------------------------
# WORKDIR
# -----------------------------------------------------------------

WORKDIR /app

# Toute commande suivante se fait depuis /app dans le conteneur

# -----------------------------------------------------------------
# DÉPENDANCES PYTHON
# -----------------------------------------------------------------

COPY requirements.txt .

RUN pip install --user --no-cache-dir -r requirements.txt

# requirements.txt :
#   - liste des libs nécessaires au gateway (fastapi, httpx, redis, etc.)
#
# pip install --user :
#   - installe dans /root/.local (pour root)
#   - ensuite on utilisera PATH pour /home/appuser/.local quand on switch user

# -----------------------------------------------------------------
# DOSSIERS DE L’APP
# -----------------------------------------------------------------

RUN mkdir -p /app/app /app/logs && \
    chown -R appuser:appuser /app

# /app/app  : code de l’application Python
# /app/logs : si vous voulez écrire des logs sur disque

# -----------------------------------------------------------------
# SWITCH UTILISATEUR
# -----------------------------------------------------------------

USER appuser

# À partir d’ici, tout se fait sous appuser (pas root)

# -----------------------------------------------------------------
# COPIE DU CODE
# -----------------------------------------------------------------

COPY --chown=appuser:appuser ./app /app/app

# Copie le dossier backend/api-gateway/app → /app/app
# avec ownership appuser:appuser

# -----------------------------------------------------------------
# PATH
# -----------------------------------------------------------------

ENV PATH=/home/appuser/.local/bin:$PATH

# Ajoute /home/appuser/.local/bin en début de PATH
# C’est là que pip --user installe les exécutables (uvicorn, etc.)

# -----------------------------------------------------------------
# PORT
# -----------------------------------------------------------------

EXPOSE 8000

# Port de l’API Gateway (interne au réseau docker)

# -----------------------------------------------------------------
# CMD
# -----------------------------------------------------------------

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# uvicorn app.main:app :
#   - module = app.main (fichier app/main.py)
#   - app    = variable "app" dans main.py
#
# --host 0.0.0.0 :
#   - écoute sur toutes les interfaces du conteneur
#
# --port 8000 :
#   - port interne