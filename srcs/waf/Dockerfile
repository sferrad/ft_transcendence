FROM owasp/modsecurity-crs:nginx-alpine

COPY ./conf/nginx.conf /etc/nginx/nginx.conf

# Override ModSecurity main configuration (blocking mode)
COPY ./conf/modsecurity.conf /etc/modsecurity.d/modsecurity.conf

# Override OWASP CRS setup (paranoia level, thresholds, project tuning)
COPY ./conf/crs-setup.conf /etc/modsecurity.d/owasp-crs/crs-setup.conf

# Project-specific exclusion rules (loaded before and after CRS rules)
COPY ./conf/REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf \
     /etc/modsecurity.d/owasp-crs/rules/REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf

COPY ./conf/RESPONSE-999-EXCLUSION-RULES-AFTER-CRS.conf \
     /etc/modsecurity.d/owasp-crs/rules/RESPONSE-999-EXCLUSION-RULES-AFTER-CRS.conf

# Create directories for ModSecurity audit and debug logs
RUN mkdir -p /var/log/modsecurity /tmp/modsecurity && \
    chown -R nginx:nginx /var/log/modsecurity /tmp/modsecurity

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]