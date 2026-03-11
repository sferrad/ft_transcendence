FROM owasp/modsecurity-crs:nginx-alpine

# Main nginx reverse-proxy configuration
COPY ./conf/nginx.conf /etc/nginx/nginx.conf

# ModSecurity engine settings (blocking mode, audit logging, body limits)
COPY ./conf/modsecurity.conf /etc/modsecurity.d/modsecurity.conf

# OWASP CRS parameters (paranoia level, anomaly thresholds, HTTP policy)
COPY ./conf/crs-setup.conf /etc/modsecurity.d/crs-setup.conf

# Master include file that controls load order
COPY ./conf/include.conf /etc/modsecurity.d/include.conf

# Project-specific exclusions — loaded explicitly after all CRS rules
COPY ./conf/custom-exclusions.conf /etc/modsecurity.d/custom-exclusions.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]