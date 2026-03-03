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

    token = None

    token_file = os.getenv("VAULT_TOKEN_FILE")

    if token_file:
        token = read_token(token_file)
    

    if not token:
        raise RuntimeError("game-service: Vault token missing, set VAULT_TOKEN_FILE")
    
    client = hvac.Client(url=vault_addr, token=token)

    if not client:
        raise RuntimeError("game-service: Vault authentification failed (check token)")
    
    return client
    