FROM node:18-alpine

WORKDIR /app

# Install dependencies first
COPY package*.json ./
RUN npm ci --only=production --no-cache

# Install dev dependencies for build
RUN npm ci --no-cache

# Copy tsconfig and source code
COPY tsconfig.json ./
COPY src ./src

# Build the application
RUN npx tsc

# Copy other necessary files
COPY . .

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/index.js"]