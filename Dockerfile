FROM docker:latest

RUN apk add --no-cache docker-compose python3 py3-pip

WORKDIR /app

COPY docker-compose.yml .
COPY services/ ./services/
COPY .env.example ./.env

CMD ["docker-compose", "up"]
