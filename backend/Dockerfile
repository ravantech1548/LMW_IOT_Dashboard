FROM node:20-alpine

WORKDIR /app

# Install tzdata for timezone support
RUN apk add --no-cache tzdata

COPY package*.json ./

# Aggressive network settings for slow QEMU builds
RUN npm config set fetch-retry-maxtimeout 600000 \
    && npm config set fetch-retry-mintimeout 10000 \
    && npm config set fetch-retries 20 \
    && npm config set maxsockets 1 \
    && npm config set strict-ssl false

RUN npm install

COPY . .

RUN chmod +x start.sh

EXPOSE 5000

CMD ["./start.sh"]
