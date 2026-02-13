# Immagine nginx da Docker Hub (ufficiale)
FROM nginx:stable-alpine3.23

# Rimuove la config di default e usa quella per SPA Angular
RUN rm -f /etc/nginx/conf.d/default.conf
COPY cicd/nginx.conf /etc/nginx/conf.d/default.conf

# Copia gli artefatti della build Angular (normalizzati in dist/app dalla pipeline)
COPY dist/app /usr/share/nginx/html

# Espone la porta 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
