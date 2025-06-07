FROM node:18-alpine AS base
WORKDIR /app

# Copy package files

#include package-lock.json because of the *
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli*.json ./

# ---- Dependencies Stage ----
FROM base AS dependencies
RUN npm ci #create node_modules

# ---- Build Stage ----
FROM dependencies AS build
COPY src/ ./src/
RUN npm run build

# ---- Production Stage ----
#các step ở trên giống như cài môi trường cho máy tính \
#production stage cài cho project của mình


FROM node:18-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=build /app/dist ./dist

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "dist/main"]

# Development Stage
FROM dependencies AS development
ENV NODE_ENV=development

# Copy source code
COPY src/ ./src/
COPY nest-cli*.json ./
COPY tsconfig*.json ./
COPY tsconfig.build*.json ./

EXPOSE 3000 9229

# Use alternative debug command
CMD ["node", "--inspect=0.0.0.0:9229", "-r", "ts-node/register", "src/main.ts"]