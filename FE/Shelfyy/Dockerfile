# ── Stage 1: Build React/Vite app ─────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build


# ── Stage 2: Serve bằng Nginx ─────────────────────────────
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Tạo nginx config để:
# 1. Serve React app
# 2. Proxy /api sang Spring Boot container app:8080
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # FIX: nginx mặc định chỉ cho phép body tối đa 1MB (client_max_body_size),
    # nhỏ hơn nhiều so với giới hạn 10-15MB mà BE (application.properties:
    # spring.servlet.multipart.max-file-size/max-request-size) cho phép — nên
    # upload ảnh tủ đồ luôn bị nginx chặn trước với lỗi "413 Request Entity
    # Too Large" trước khi request kịp tới Spring Boot. Nâng lên 15M cho khớp.
    client_max_body_size 15M;

    # React Router / Hash Router fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Spring Boot backend
    location /api/ {
        proxy_pass http://app:8080/api/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]