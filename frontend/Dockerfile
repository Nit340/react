FROM nginx:1.28.0-alpine-slim

# Copy Nginx config
COPY frontend/nginx-docker.conf /etc/nginx/conf.d/default.conf

# Copy React build folder
COPY frontend/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
