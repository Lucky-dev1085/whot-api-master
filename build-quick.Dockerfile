FROM whot-api-master as builder
ENV LANG en_US.utf8

WORKDIR /usr/local/whot-api
COPY . /usr/local/whot-api
COPY src /usr/local/whot-api/dist

RUN rm .env
EXPOSE 8008
CMD ["sh", "-c", "make dbup && npm run prod"]
