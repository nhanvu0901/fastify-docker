FROM node:18-alpine AS builder
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Copy tsconfig.json for the build process
COPY tsconfig.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy the rest of the application source code
COPY ./src ./src

# Build the TypeScript code
RUN npm run build

# ---- Production Stage ----
FROM node:18-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

# Copy package.json and package-lock.json for installing production dependencies
COPY package.json ./
COPY package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app
CMD [ "node", "dist/app.js" ]

# ---- Development/Debug Stage ----
FROM node:18-alpine AS development
ENV NODE_ENV=development
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./
COPY package-lock.json ./

# Install all dependencies (including devDependencies for development)
RUN npm ci

# Copy tsconfig.json
COPY tsconfig.json ./

# Copy source code
COPY ./src ./src

# Install ts-node and nodemon globally for development
RUN npm install -g ts-node nodemon

# Expose both app port and debug port
EXPOSE 3000 9229

# Command for development with debugging enabled
# Pass --inspect flag to node through nodemon's --nodeArgs
CMD ["nodemon", "--exec", "node", "--inspect=0.0.0.0:9229", "-r", "ts-node/register", "src/app.ts"]