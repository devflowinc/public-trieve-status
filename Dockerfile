FROM node:18-alpine3.18 AS runtime
RUN apk update && apk add openssl-dev pkgconfig build-base curl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/ 
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

ENV HOST=0.0.0.0 \
         PORT=3000
         EXPOSE 3000

COPY . .

RUN npm run build 
CMD node ./dist/server/entry.mjs
