FROM node:24-alpine

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy application source code
COPY . .

# Build Next.js production package
RUN npm run build

# Expose port 3000 for the Next.js web application
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start the application
CMD ["npm", "run", "start"]
