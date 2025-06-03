FROM node:18-alpine AS base
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli*.json ./

# ---- Dependencies Stage ----
FROM base AS dependencies
RUN npm ci

# ---- Build Stage ----
FROM dependencies AS build
COPY src/ ./src/
RUN npm run build

# ---- Production Stage ----
FROM node:18-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=build /app/dist ./dist

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "dist/main"]

# ---- Development Stage ----
FROM dependencies AS development
ENV NODE_ENV=development

# Copy source code
COPY src/ ./src/

# Install development tools globally
RUN npm install -g @nestjs/cli

# Expose both app and debug ports
EXPOSE 3000 9229

# Development command with debugging
CMD ["npm", "run", "start:debug"]