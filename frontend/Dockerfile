# ===============================
# Stage 1: React Build
# ===============================
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# ===============================
# Stage 2: Nginx serve
# ===============================
FROM nginx:1.28.0-alpine-slim

# Copy your custom Nginx configuration
COPY nginx-docker.conf /etc/nginx/conf.d/default.conf

# Copy the build output from React
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
