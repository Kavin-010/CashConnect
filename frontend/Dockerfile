# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build-time env vars (Vite needs these at build time)
ARG VITE_API_URL=http://localhost:4000/graphql
ARG VITE_WS_URL=ws://localhost:4000/graphql

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build the React app
RUN npm run build

# ── Stage 2: Nginx server ─────────────────────────────────────────────────────
FROM nginx:alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/campuscash.conf

# Copy built React files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]