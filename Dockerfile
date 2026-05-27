# syntax=docker/dockerfile:1

FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y unzip && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
ENV PUPPETEER_SKIP_DOWNLOAD=1
RUN npm install

COPY . ./
RUN npm run build
RUN npm prune --production

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
