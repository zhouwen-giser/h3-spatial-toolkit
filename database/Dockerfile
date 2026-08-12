ARG POSTGIS_IMAGE=postgis/postgis:17-3.5-alpine@sha256:61cb994f576480f5736974e5c9aff965d039d965301bcaec9c7ea72f94b61908
FROM ${POSTGIS_IMAGE}
ARG POSTGIS_IMAGE
ARG SOURCE_REVISION=uncommitted
LABEL org.opencontainers.image.revision=${SOURCE_REVISION} \
  org.opencontainers.image.base.name=${POSTGIS_IMAGE}

ARG H3_PG_VERSION=4.5.0
ARG H3_PG_SHA256=72f48359cd49ffaa38eb22fbaa607d5497e0144a8f94824f826beb0b370c40d8
RUN apk add --no-cache --virtual .h3-build-deps build-base cmake curl postgresql17-dev unzip \
  && curl --fail --location --silent --show-error \
    "https://api.pgxn.org/dist/h3/${H3_PG_VERSION}/h3-${H3_PG_VERSION}.zip" \
    --output /tmp/h3-pg.zip \
  && echo "${H3_PG_SHA256}  /tmp/h3-pg.zip" | sha256sum -c - \
  && unzip -q /tmp/h3-pg.zip -d /tmp \
  && cmake -S "/tmp/h3-${H3_PG_VERSION}" -B "/tmp/h3-${H3_PG_VERSION}/build" -DCMAKE_BUILD_TYPE=Release \
  && cmake --build "/tmp/h3-${H3_PG_VERSION}/build" --parallel \
  && cmake --install "/tmp/h3-${H3_PG_VERSION}/build" --component h3-pg \
  && apk del .h3-build-deps \
  && rm -rf /tmp/*
