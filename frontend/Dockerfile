# Stage 1: Build React Application
FROM node:20-alpine AS builder

WORKDIR /app

# Set build arguments and environment variables
ARG REACT_APP_BACKEND_URL=""
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL \
    GENERATE_SOURCEMAP=false \
    CI=false

# Copy package descriptors
COPY package.json package-lock.json ./

# Install exact dependencies
RUN npm ci --legacy-peer-deps

# Copy all source files
COPY . .

# Build the production bundle
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built application from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
