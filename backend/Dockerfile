FROM node:18-slim
RUN apt-get update && apt-get install -y python3 make g++ sqlite3 build-essential && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm cache clean --force && npm install --omit=dev
COPY src/ ./src/
RUN mkdir -p /app/data /app/uploads/temp
EXPOSE 3001
CMD ["node", "src/server.js"]