FROM docker.io/owasp/modsecurity-crs:nginx-alpine

ENV MANUAL_MODE=1

# Créer le répertoire de logs ModSecurity
USER root
RUN mkdir -p /var/log/modsecurity && \
    chown nginx:nginx /var/log/modsecurity && \
    rm -f /etc/nginx/templates/nginx.conf.template

COPY ./conf/nginx.conf /etc/nginx/nginx.conf
COPY ./conf/modsecurity.conf /etc/modsecurity.d/modsecurity-override.conf
COPY ./conf/crs-setup.conf /etc/modsecurity.d/owasp-crs/crs-setup.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]