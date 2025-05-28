FROM node:18-alpine AS builder
WORKDIR /app

# Copy package.json and package-lock.json (if available)
# Using package*.json copies both if they exist
COPY package*.json ./

# Copy tsconfig.json for the build process
COPY tsconfig.json ./

# Install all dependencies (including devDependencies)
# npm ci is generally preferred in CI/build environments as it uses the lock file
# and provides faster, more reliable builds.
RUN npm ci

# Copy the rest of the application source code
COPY ./src ./src

# Build the TypeScript code
RUN npm run build

# ---- Production Stage ----
# This stage creates the final image with only production dependencies and built code
FROM node:18-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

# Copy package.json and package-lock.json for installing production dependencies
COPY package.json ./
COPY package-lock.json ./

# Install only production dependencies using the lock file
# --omit=dev is the modern equivalent of --only=production for npm ci
RUN npm ci --omit=dev && npm cache clean --force

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on (as defined in your app and docker-compose)
EXPOSE 3000

# Define the command to run the app
# This should match the "main" script in your package.json or your specific start command
CMD [ "node", "dist/app.js" ]