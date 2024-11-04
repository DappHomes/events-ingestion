FROM node:22.9.0

COPY . /events-ingestion

WORKDIR /events-ingestion/
RUN npm install

ENTRYPOINT ["npm", "start"]
