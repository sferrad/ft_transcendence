FROM docker.io/hashicorp/vault:1.15

COPY config/ /vault/config

COPY policies/ /vault/policies/

COPY scripts /vault/scripts

RUN apk update && apk add --no-cache bash jq && \
    mkdir -p /vault/data /vault/logs /vault/private && \
    chmod 775 /vault/scripts && \
    chmod 755 /vault/scripts/*.sh && \
    chmod 711 /vault/data && \
    chmod 700 /vault/private && \
    chmod 755 /vault/logs


ENV VAULT_ADDR=http://127.0.0.1:8200

EXPOSE 8200

ENTRYPOINT [ "/vault/scripts/init.sh" ]

CMD [ "server", "-config=/vault/config/config.hcl" ]