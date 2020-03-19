FROM node:12-alpine
WORKDIR /usr/src/app
COPY ./package*.json .npmrc ./
RUN npm install --only=production
COPY ./src/ ./src
CMD [ "node", "./src/index.js" ]
