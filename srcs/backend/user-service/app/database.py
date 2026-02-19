import os
from sqlalchemy import create_engine

# etape:
# - creation url connexion DB
# - creation engine ORM -> gere les connexion a la DB
# - creation session -> conversation avec la DB
# - creation patron classe de base que les modeles heriteront (recherche, sauvegarde, modif, suppr, etc)
# - def fonction used par fastapi pour etablir une connexion avec la DB

DATABASE_URL = (
    f"postgresql://"
    f"{os.getenv('POSTGRES_USER', 'default_user')}:"
    f"{os.getenv('POSTGRES_PASSWORD', 'default_pass')}"
    f"@user-db:5432/"
    f"{os.getenv('POSTGRES_DB', 'user-db')}"
)