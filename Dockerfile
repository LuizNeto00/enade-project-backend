# ---------- Desenvolvimento ----------
FROM node:22-alpine AS development
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ---------- Build ----------
FROM development AS build
RUN npm run build

# ---------- Produção ----------
FROM node:22-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /usr/src/app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main"]
