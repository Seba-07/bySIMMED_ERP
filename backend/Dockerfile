FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev for build)
RUN npm install

# Copy all source files
COPY . .

# Build the application
RUN npm run build

# Expose the PORT environment variable
EXPOSE ${PORT:-3001}

# Start with node directly
CMD ["node", "dist/index.js"]