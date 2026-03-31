# Stage 1 — Build
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_URL must be passed at build time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2 — Serve with nginx (static, no Node.js at runtime)
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing — redirect all 404s to index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
