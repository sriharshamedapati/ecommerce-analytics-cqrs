FROM node:18

WORKDIR /app
COPY . .

RUN npm init -y
RUN npm install express pg uuid@8.3.2 amqplib

CMD ["node","src/main.js"]