# Build stage
FROM node:22 AS builder

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
#
# Note when using COPY with more than one source file, 
# the destination must be a directory and end with a /
COPY package*.json ./
RUN npm ci

COPY src ./src
COPY views ./views
COPY public ./public
COPY tsconfig*.json ./
COPY nest-cli.json .
COPY tailwind.config.js .
COPY workbox-config.js .

RUN npm run build

# Production stage
FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/views ./views
COPY --from=builder /app/public ./public

COPY .env .

# Set NODE_ENV to production
ENV NODE_ENV=production

EXPOSE 3000

CMD [ "npm", "run", "start:prod" ]