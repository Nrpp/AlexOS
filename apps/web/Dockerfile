# Production image: build the Vite app in a monorepo-aware stage, then
# serve the static bundle with nginx. Build context is the repo root
# (see docker/docker-compose.yml) so npm workspaces resolve correctly.
FROM node:20-alpine AS build
WORKDIR /repo

COPY package.json ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN npm install

WORKDIR /repo/apps/web
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
