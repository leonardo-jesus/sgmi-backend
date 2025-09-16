FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files and prisma directory
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install all dependencies (needed for Prisma generate)
RUN npm ci && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Install tsx globally for production runtime
RUN npm install -g tsx

# Copy the rest of the source code
COPY . .

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Start command with migrations and seeding
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && tsx src/server.ts"]
