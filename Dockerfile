ARG NODE_IMAGE=node:24-bookworm-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03
FROM ${NODE_IMAGE} AS build
ARG NODE_IMAGE
ARG SOURCE_REVISION=uncommitted
LABEL org.opencontainers.image.revision=${SOURCE_REVISION} \
  org.opencontainers.image.base.name=${NODE_IMAGE}
ENV CI=true
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @h3-toolkit/api... build \
  && pnpm --config.inject-workspace-packages=true --filter @h3-toolkit/api deploy --prod /prod/api

FROM ${NODE_IMAGE} AS runtime
ARG NODE_IMAGE
ARG SOURCE_REVISION=uncommitted
LABEL org.opencontainers.image.revision=${SOURCE_REVISION} \
  org.opencontainers.image.base.name=${NODE_IMAGE}
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-v1.22.22 \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /usr/local/bin/pnpm /usr/local/bin/pnpx /usr/local/bin/yarn /usr/local/bin/yarnpkg
COPY --from=build --chown=node:node /prod/api ./
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
