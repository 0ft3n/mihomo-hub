FROM node:22-alpine AS build
WORKDIR /app
COPY package.json tsconfig.json vite-env.d.ts index.html ./
RUN npm install
COPY public ./public
COPY src.tsx app.tsx public.tsx shared.tsx style.css ./
RUN npm run build
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
