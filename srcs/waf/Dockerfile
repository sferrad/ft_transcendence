FROM docker.io/owasp/modsecurity-crs:nginx-alpine

# MANUAL_MODE=1 
# - L'image CRS peut générer/templater une config Nginx par défaut.
# - Ici on veut contrôler 100% de la conf -> on active le mode "manual".
ENV MANUAL_MODE=1

# Créer le répertoire de logs ModSecurity
USER root
RUN mkdir -p /var/log/modsecurity && \
    chown nginx:nginx /var/log/modsecurity && \
    rm -f /etc/nginx/templates/nginx.conf.template

# On copie nos configs dans les emplacements attendus par l'image:
# - nginx.conf : reverse-proxy + TLS + rate-limit
# - modsecurity-override.conf : réglages ModSecurity (engine, audit log, etc.)
# - crs-setup.conf : tuning CRS (paranoia, thresholds, exclusions)
COPY ./conf/nginx.conf /etc/nginx/nginx.conf
COPY ./conf/modsecurity.conf /etc/modsecurity.d/modsecurity-override.conf
COPY ./conf/crs-setup.conf /etc/modsecurity.d/owasp-crs/crs-setup.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]