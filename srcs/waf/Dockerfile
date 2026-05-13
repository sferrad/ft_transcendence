FROM docker.io/owasp/modsecurity-crs:nginx-alpine

# MANUAL_MODE=1 
# - L'image CRS peut générer/templater une config Nginx par défaut.
# - Ici on veut contrôler 100% de la conf -> on active le mode "manual".
ENV MANUAL_MODE=1

# Créer le répertoire de logs ModSecurity
USER root
RUN mkdir -p /var/log/modsecurity && \
    chown nginx:nginx /var/log/modsecurity && \
    rm -f /etc/nginx/templates/nginx.conf.template && \
    # IMPORTANT: l'image CRS génère /etc/nginx/* depuis /etc/nginx/templates via envsubst.
    # Le template `modsecurity-override.conf.template` est vide et écrase notre override au runtime.
    # On le supprime pour conserver notre fichier custom copié ci-dessous.
    rm -f /etc/nginx/templates/modsecurity.d/modsecurity-override.conf.template

# On copie nos configs dans les emplacements attendus par l'image:
# - nginx.conf : reverse-proxy + TLS + rate-limit
# - modsecurity-override.conf : réglages ModSecurity (engine, audit log, etc.)
# - crs-setup.conf : tuning CRS (paranoia, thresholds, exclusions)
COPY ./conf/nginx.conf /etc/nginx/nginx.conf
# IMPORTANT: l'entrypoint de l'image CRS copie /etc/nginx/modsecurity.d/*.conf -> /etc/modsecurity.d/
# (cf. /docker-entrypoint.d/90-copy-modsecurity-config.sh). On place donc nos overrides dans
# /etc/nginx/modsecurity.d/ pour éviter qu'ils soient écrasés au runtime.
COPY ./conf/modsecurity.conf /etc/nginx/modsecurity.d/modsecurity-override.conf
COPY ./conf/crs-setup.conf /etc/modsecurity.d/owasp-crs/crs-setup.conf

# Script d'entrypoint: détecte le DNS resolver (Docker vs Podman) et patch nginx.conf.
COPY ./conf/20-set-resolver.sh /docker-entrypoint.d/20-set-resolver.sh
RUN chmod +x /docker-entrypoint.d/20-set-resolver.sh

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]