FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci || npm install
COPY . .
RUN npm run build
ENV NODE_ENV=production
CMD ["sh","-c","npm run migrate && npm run seed && node dist/server.js"]
