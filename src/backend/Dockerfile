################################################################################
# Multi-stage Dockerfile for TaskStream AI Backend - Optimized for:
#   - Python 3.11-slim base for Python services
#   - Node.js 18-alpine base for Node.js services
#   - Enhanced security (non-root user, minimal images, scanning)
#   - Performance and layer caching
#   - Production-grade best practices
################################################################################

############################
# 1) Node Builder Stage
############################
FROM node:18-alpine AS node_builder
# [node=18-alpine] Lightweight Node.js 18 base image

# Set environment variables for Node build
ENV NODE_ENV=development
ENV WORKDIR=/build/node

# Create and switch to a temporary directory for Node build
WORKDIR $WORKDIR

# Install OS-level dependencies for building native Node modules
# (if needed for certain deps, e.g., bcrypt)
RUN apk --no-cache add \
    python3 \
    make \
    g++ \
    git

# Copy Node package files
COPY package.json ./

# Install dependencies (using npm ci for reproducible builds)
RUN npm ci

# Copy all source code for Node build context
COPY . ./

# Build TypeScript (if tsconfig.json is found in the context)
# Note: If your TypeScript config or build scripts differ, adjust accordingly
RUN if [ -f "tsconfig.json" ]; then npm run build; fi

# Prune development dependencies to minimize final bundle
RUN npm prune --production

################################################################################
# 2) Python Builder Stage
################################################################################
FROM python:3.11-slim AS python_builder
# [python=3.11-slim] Minimal Python 3.11 base image

# Environment variables to enhance Python performance and consistent logging
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHON_ENV=production \
    WORKDIR=/build/python

# Switch to a temporary directory for Python build
WORKDIR $WORKDIR

# Update package lists and install system dependencies needed for compiling wheels
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libpq-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy Python package requirements for installation
COPY requirements.txt ./

# Upgrade pip and create wheel packages for all dependencies
RUN pip install --upgrade pip && \
    pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# (Optional) Copy Python application source code if you have local modules
# used during the wheel creation process or if your code uses a local setup.py
COPY . ./

################################################################################
# 3) Security Scanner Stage
################################################################################
FROM aquasec/trivy:latest AS security_scanner
# [trivy=latest] Trivy for container vulnerability scanning

# Example security scanning commands for base images
# (Adjust severity threshold or scanning approach as required)
RUN trivy image --severity=HIGH --ignore-unfixed python:3.11-slim || true
RUN trivy image --severity=HIGH --ignore-unfixed node:18-alpine || true

# Optionally scan local filesystem or builder artifacts if needed:
# COPY --from=node_builder /build /build
# COPY --from=python_builder /build /build
# RUN trivy fs --severity=HIGH /build || true

################################################################################
# 4) Node Production Stage
################################################################################
FROM node:18-alpine AS node_production
# [node=18-alpine] Minimal Node.js 18 final image for production

# Create a non-root user and group (taskstream) for security
RUN addgroup -g 1000 taskstream && \
    adduser -D -u 1000 -G taskstream taskstream

# Set global environment variables
ENV NODE_ENV=production \
    PORT=8000 \
    WORKDIR=/app

# Create and set the working directory
WORKDIR $WORKDIR

# Copy Node build artifacts staged in node_builder
COPY --from=node_builder /build/node/node_modules ./node_modules
COPY --from=node_builder /build/node/dist ./dist

# Ensure correct ownership for non-root user
RUN chown -R taskstream:taskstream $WORKDIR

# Switch to non-root user
USER taskstream

# Expose the application port
EXPOSE 8000

# Configure a basic health check (example endpoint /health)
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget -qO- http://localhost:8000/health || exit 1

# Launch the Node.js application
CMD ["node", "dist/index.js"]

################################################################################
# 5) Python Production Stage
################################################################################
FROM python:3.11-slim AS python_production
# [python=3.11-slim] Minimal Python 3.11 final image for production

# Create a non-root user and group (taskstream) for security
RUN addgroup --gid 1000 taskstream && \
    adduser --uid 1000 --gid 1000 --disabled-password taskstream

# Set production environment variables for Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHON_ENV=production \
    PORT=8000 \
    WORKDIR=/app

# Create and set the working directory
WORKDIR $WORKDIR

# Copy the prepared Python wheels from the builder
COPY --from=python_builder /wheels /wheels

# Install Python packages from wheel files
RUN pip install --no-cache-dir /wheels/*.whl

# (Optional) Copy your Python application source if not installed via wheels
# Adjust paths to match your application structure
COPY --from=python_builder /build/python ./

# Ensure correct ownership for non-root user
RUN chown -R taskstream:taskstream $WORKDIR

# Switch to the non-root user
USER taskstream

# Expose the Python service port
EXPOSE 8000

# Basic health check for Python FastAPI or other frameworks (example endpoint)
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget -qO- http://localhost:8000/health || exit 1

# Run Python server (Example: Gunicorn + Uvicorn worker)
# Adjust the module and callable to match your application entry point
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "main:app", "--workers=4", "--worker-class", "uvicorn.workers.UvicornWorker"]