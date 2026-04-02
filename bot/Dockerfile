FROM node:20-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

# Remove dev/local-only files if they sneak in
RUN rm -f .env users.json

CMD ["node", "bot.js"]
