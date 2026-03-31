FROM node:18-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Don't copy .env — pass env vars at runtime
RUN rm -f .env

EXPOSE 3000

CMD ["node", "server.js"]
