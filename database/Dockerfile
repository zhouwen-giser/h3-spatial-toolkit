FROM postgis/postgis:17-3.5

ARG H3_PG_VERSION=4.5.0
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential ca-certificates cmake pgxnclient postgresql-server-dev-17 \
  && pgxn install "h3=${H3_PG_VERSION}" \
  && apt-get purge -y --auto-remove build-essential cmake pgxnclient postgresql-server-dev-17 \
  && rm -rf /var/lib/apt/lists/* /tmp/*
