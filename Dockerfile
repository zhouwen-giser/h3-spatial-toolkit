FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @h3-toolkit/api... build \
  && pnpm --config.inject-workspace-packages=true --filter @h3-toolkit/api deploy --prod /prod/api

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /prod/api ./
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
