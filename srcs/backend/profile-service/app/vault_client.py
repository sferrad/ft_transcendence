# Creer un client vault(hvac.client)
# fichier isole pour reutilisation ailleurs

import os
import hvac

# fonction     param            type type retour | sinon None 
def read_token(token_file_path: str) -> str | None:
    try:
        with open(token_file_path, "r", encoding="utf-8") as f:
            token = f.read().strip()
        return token or None
    except FileNotFoundError:
        return None


# Creer et retourne un client vault authentifie
def get_vault_client() -> hvac.Client:
    vault_addr = os.getenv("VAULT_ADDR")

    token_file = os.getenv("VAULT_TOKEN_FILE")
    if not vault_addr or not token_file:
        raise RuntimeError("game-service: Vault token or vault addr missing, set VAULT_TOKEN_FILE and/or VAULT_ADDR")
    token = read_token(token_file)
    if not token:
        raise RuntimeError("game-service: Error reading token file, token is not set")
    client = hvac.Client(url=vault_addr, token=token)

    if not client.is_authenticated():
        raise RuntimeError("game-service: Vault authentification failed (check token)")
    
    return client
    