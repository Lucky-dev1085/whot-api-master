FROM node:10-alpine as builder
ENV LANG en_US.utf8

RUN mkdir -p /usr/local/whot-api
WORKDIR /usr/local/whot-api

RUN apk update \
  && apk add --no-cache make python gcc g++ libgcc libc-dev make jq \
  && apk add --update-cache --no-cache libgcc libquadmath musl \
  && apk add --update-cache --no-cache libgfortran \
  && apk add --update-cache --no-cache lapack-dev \
  && apk add --update-cache --no-cache gfortran \
  && rm -rf /root/.cache


COPY . /usr/local/whot-api
RUN npm install --unsafe-perm && npm run build

RUN rm .env
EXPOSE 8008
CMD ["sh", "-c", "make dbup && npm run prod"]
