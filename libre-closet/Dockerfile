ARG BUILD_FROM=node:22
FROM ${BUILD_FROM} AS builder
WORKDIR /app
COPY package*.json ./
COPY patches ./patches
RUN npm ci
COPY src ./src
COPY views ./views
COPY public ./public
COPY tsconfig*.json ./
COPY nest-cli.json .
COPY tailwind.config.js .
COPY workbox-config.js .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY package*.json ./
COPY patches ./patches
RUN npm ci
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/views ./views
COPY --from=builder /app/public ./public
COPY .env .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
