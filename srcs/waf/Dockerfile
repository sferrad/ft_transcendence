FROM owasp/modsecurity-crs:nginx-alpine

COPY ./conf/default.conf.template /etc/nginx/templates/conf.d/default.conf.template

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]