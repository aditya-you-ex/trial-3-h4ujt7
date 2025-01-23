###############################################################################
# Multi-stage Dockerfile for TaskStream AI Web Application
# -----------------------------------------------------------------------------
# This Dockerfile builds and serves the TaskStream AI frontend, leveraging a
# multi-stage approach for a minimal final image (target ~250MB). It addresses:
# 1) React 18+, Redux Toolkit 1.9+, MUI 5.14+, D3.js 7.8+ (Frontend stack)
# 2) Production containerization on nginx:1.25-alpine
# 3) Security requirements (running as non-root, minimal dependencies)
# 4) Layer caching optimizations to shorten build time and reduce image size
###############################################################################

############################
# Stage 1: Builder
############################
# -- Using the official Node.js v18 on Alpine base image for minimal footprint
FROM node:18-alpine AS builder

# -----------------------------------------------------------------------------
# Labels (used informatively; some are carried into subsequent stages)
# -----------------------------------------------------------------------------
LABEL stage="builder"

# -----------------------------------------------------------------------------
# Build Arguments (to pass runtime config for the build process)
# -----------------------------------------------------------------------------
ARG API_URL
ARG APP_VERSION
ARG NODE_ENV=production
ARG BUILD_TIME

# -----------------------------------------------------------------------------
# Set environment variables used during the build
# -----------------------------------------------------------------------------
ENV NODE_ENV="${NODE_ENV}"
ENV VITE_API_URL="${API_URL}"
ENV VITE_APP_VERSION="${APP_VERSION}"

# -----------------------------------------------------------------------------
# Create and set the working directory
# -----------------------------------------------------------------------------
WORKDIR /app

# -----------------------------------------------------------------------------
# Copy only the package definitions to leverage Docker layer caching.
# This prevents re-downloading dependencies unless package.json or yarn.lock change.
# -----------------------------------------------------------------------------
COPY package.json yarn.lock ./

# -----------------------------------------------------------------------------
# Install dependencies (production or dev dependencies).
# Using --frozen-lockfile ensures exact versions from yarn.lock.
# Network timeout is explicitly set for CI/CD stability.
# -----------------------------------------------------------------------------
RUN yarn install --frozen-lockfile --network-timeout 600000

# -----------------------------------------------------------------------------
# Copy all remaining project files (including source) into the container.
# These files contain our React application, config, and so on.
# -----------------------------------------------------------------------------
COPY . .

# -----------------------------------------------------------------------------
# Run the production build step for the React application, generating /app/dist.
# -----------------------------------------------------------------------------
RUN yarn build

# -----------------------------------------------------------------------------
# Install only production dependencies (removing dev dependencies).
# This cleans up the node_modules to reduce final artifacts.
# -----------------------------------------------------------------------------
RUN yarn install --production --ignore-scripts --prefer-offline

# -----------------------------------------------------------------------------
# End of Builder Stage
# /app/dist will be used in the next stage for the final production image
# -----------------------------------------------------------------------------

############################
# Stage 2: Production
############################
# -- Using the official NGINX v1.25 on Alpine for minimal footprint
FROM nginx:1.25-alpine

# -----------------------------------------------------------------------------
# Labels (carried from or overridden in final production stage)
# These labels match the specification for robust build metadata.
# -----------------------------------------------------------------------------
LABEL maintainer="TaskStream AI Team"
LABEL version="${APP_VERSION}"
LABEL build_time="${BUILD_TIME}"
LABEL stage="production"

# -----------------------------------------------------------------------------
# Build Arguments for continuity, if needed
# -----------------------------------------------------------------------------
ARG APP_VERSION
ARG BUILD_TIME

# -----------------------------------------------------------------------------
# Environment variables for runtime
# NGINX_USER set to "nginx" to run unprivileged, ensuring security best practices.
# NGINX_WORKER_PROCESSES and NGINX_WORKER_CONNECTIONS control server concurrency.
# -----------------------------------------------------------------------------
ENV NGINX_USER="nginx"
ENV NGINX_WORKER_PROCESSES="auto"
ENV NGINX_WORKER_CONNECTIONS="1024"

# -----------------------------------------------------------------------------
# Set the working directory to where nginx will serve files by default.
# -----------------------------------------------------------------------------
WORKDIR /usr/share/nginx/html

# -----------------------------------------------------------------------------
# Copy the build artifacts from the builder stage into this final image,
# ensuring only the compiled dist files are included.
# -----------------------------------------------------------------------------
COPY --from=builder /app/dist .

# -----------------------------------------------------------------------------
# Adjust ownership and file permissions for security and minimal privileges.
# -----------------------------------------------------------------------------
RUN chown -R ${NGINX_USER}:${NGINX_USER} /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# -----------------------------------------------------------------------------
# Switch to the non-root "nginx" user to comply with security best practices.
# -----------------------------------------------------------------------------
USER ${NGINX_USER}

# -----------------------------------------------------------------------------
# Expose the default HTTP port.
# -----------------------------------------------------------------------------
EXPOSE 80

# -----------------------------------------------------------------------------
# Health Check for container orchestration.
# We use wget to quickly query the application root or a /health path.
# -----------------------------------------------------------------------------
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# -----------------------------------------------------------------------------
# Final command to start nginx in the foreground (daemon off).
# -----------------------------------------------------------------------------
CMD ["nginx", "-g", "daemon off;"]