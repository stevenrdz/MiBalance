FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN apk add --no-cache poppler-utils

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
