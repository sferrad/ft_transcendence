FROM docker.io/hashicorp/vault:1.15

COPY config/ /vault/config

COPY policies/ /vault/policies/

COPY scripts /vault/scripts

RUN apk update && apk add --no-cache bash jq && \
    # Dossiers:
    # - /vault/data   : storage Vault (volume persistant)
    # - /vault/private: secrets bootstrap (init.json) -> doit rester privé
    # - /vault/logs   : logs éventuels
    mkdir -p /vault/data /vault/logs /vault/private && \
    # Scripts:
    # - 775 sur /vault/scripts pour permettre l'exécution, et lecture par le groupe.
    # - 755 sur les .sh pour pouvoir les exécuter.
    chmod 775 /vault/scripts && \
    chmod 755 /vault/scripts/*.sh && \
    # Permissions :
    # - 711 sur /vault/data: traverse OK, mais listing interdit aux autres
    # - 700 sur /vault/private: accès uniquement au propriétaire (Vault/root)
    chmod 711 /vault/data && \
    chmod 700 /vault/private && \
    chmod 755 /vault/logs


ENV VAULT_ADDR=http://127.0.0.1:8200

EXPOSE 8200

ENTRYPOINT [ "/vault/scripts/init.sh" ]

CMD [ "server", "-config=/vault/config/config.hcl" ]