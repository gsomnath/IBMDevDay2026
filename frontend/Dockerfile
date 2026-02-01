# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy package files for production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy built React app
COPY --from=builder /app/build ./build

# Copy server file
COPY server.js ./

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start the Express server (serves both API and static files)
CMD ["node", "server.js"]
