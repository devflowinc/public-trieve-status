FROM node:18-alpine3.18 AS runtime
RUN apk update && apk add openssl-dev pkgconfig build-base 
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

ENV HOST=0.0.0.0 \
         PORT=3000
         EXPOSE 3000

COPY . .

RUN npm run build 
CMD node ./dist/server/entry.mjs
