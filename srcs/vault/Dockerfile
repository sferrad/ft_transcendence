FROM docker.io/hashicorp/vault:1.15

COPY config/ /vault/config

COPY policies/ /vault/policies/

COPY --chmod=775 scripts /vault/scripts

RUN apk add --no-cache bash jq && \
    mkdir -p /vault/data /vault/logs && \
    chmod 700 /vault/data && \
    chmod 755 /vault/logs


ENV VAULT_ADDR=http://127.0.0.1:8200

EXPOSE 8200

ENTRYPOINT [ "/vault/scripts/init.sh" ]

CMD [ "server", "-config=/vault/config/config.hcl" ]