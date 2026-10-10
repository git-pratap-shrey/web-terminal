FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssh-client

COPY package*.json ./

RUN npm ci

COPY . .

RUN mkdir -p /data/ssh

EXPOSE 3000

CMD ["node", "server.js"]
