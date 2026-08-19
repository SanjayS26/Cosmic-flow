FROM node:22-bookworm-slim AS production

WORKDIR /app

RUN apt-get update \
  && apt-get install --no-install-recommends -y ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

# npm ci omits nodemon and other development-only dependencies.
RUN npm ci --omit=dev && npm cache clean --force

COPY config ./config
COPY controllers ./controllers
COPY middleware ./middleware
COPY migrations ./migrations
COPY repositories ./repositories
COPY routes ./routes
COPY scripts ./scripts
COPY services ./services
COPY utils ./utils
COPY server.js ./server.js

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Migrations are idempotent and protected by a PostgreSQL advisory lock. This
# initializes a newly provisioned managed database before the web server starts.
CMD ["sh", "-c", "npm run migrate && exec npm start"]
