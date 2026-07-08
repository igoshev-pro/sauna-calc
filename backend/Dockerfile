# ---------- build ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- production ----------
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
# ts-node + tsconfig-paths нужны для seed-скриптов
RUN npm i -D ts-node tsconfig-paths typescript
COPY --from=builder /app/dist ./dist
# исходники нужны для seed (ts-node гоняет src/seed/*.ts)
COPY --from=builder /app/src ./src
COPY tsconfig*.json ./
EXPOSE 3001
CMD ["node", "dist/main"]