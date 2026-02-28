FROM node:18

WORKDIR /app

COPY . .

RUN npm init -y
RUN npm install express amqplib pg

CMD ["node","src/main.js"]