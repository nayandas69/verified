# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --production --no-package-lock

# Copy application source code
COPY . .

# This ensures proper permissions when volume is mounted

# Run as root to ensure data directory write permissions work with mounted volumes

# Expose web server port
EXPOSE 3000

# Set Node environment to production
ENV NODE_ENV=production

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]
