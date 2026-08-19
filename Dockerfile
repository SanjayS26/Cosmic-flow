# Build the React application without copying local dependencies or secrets.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Docker Compose requests use the same-origin /api proxy configured in Nginx.
# Render Static Sites build Vite directly and set VITE_API_BASE_URL instead.
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Serve the immutable Vite build with Nginx; Vite's development server is not
# included in the runtime image.
FROM nginx:1.27-alpine AS production

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
