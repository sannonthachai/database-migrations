FROM node:18.12.1-alpine

WORKDIR /app

COPY build /app/build

COPY node_modules /app/node_modules

EXPOSE 3000

CMD ["node", "build/index.js"]