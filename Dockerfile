# --- Build ---
FROM node:20-alpine as build
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* .npmrc* ./ 2>/dev/null || true
RUN npm i --legacy-peer-deps
COPY . .
RUN npm run build

# --- Run ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app .
EXPOSE 3000
CMD ["npm","start"]
