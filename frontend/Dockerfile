# ---- Base Node ----
FROM node:lts-alpine3.19@sha256:2f46fd49c767554c089a5eb219115313b72748d8f62f5eccb58ef52bc36db4ad AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add curl bash

# Add a new user "app" and change ownership of the /app directory
RUN addgroup app && adduser -S -G app app && chown -R app:app /app

# Switch to the new user "app"
USER app

# Copy project file
COPY --chown=app:app package.json yarn.lock ./

# ---- Dependencies ----
FROM base AS dependencies

# Set NODE_ENV to production
ENV NODE_ENV production

# Disable Nextjs telemetry
ENV NEXT_TELEMETRY_DISABLED 1

# Install node packages
RUN yarn install --production --frozen-lockfile --no-cache && yarn cache clean
# Copy production node_modules aside
RUN cp -R node_modules /tmp/node_modules

# ---- Build ----
FROM dependencies AS build
COPY --chown=app:app . .

# Set public environment variable placeholders
ARG NEXT_PUBLIC_BACKEND_API_BASE=BAKED_NEXT_PUBLIC_BACKEND_API_BASE
ARG NEXT_PUBLIC_APP_HOST=BAKED_NEXT_PUBLIC_APP_HOST
ARG NEXT_PUBLIC_POSTHOG_KEY=BAKED_NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST=BAKED_NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_GITHUB_INTEGRATION_CLIENT_ID=BAKED_NEXT_PUBLIC_GITHUB_INTEGRATION_CLIENT_ID
ARG NEXT_PUBLIC_GITHUB_ENTERPRISE_INTEGRATION_CLIENT_ID=BAKED_NEXT_PUBLIC_GITHUB_ENTERPRISE_INTEGRATION_CLIENT_ID
ARG NEXT_PUBLIC_STRIPE_PUBLIC_KEY=BAKED_NEXT_PUBLIC_STRIPE_PUBLIC_KEY
RUN yarn build

# ---- Release ----
FROM base AS release
# Copy standalone output
COPY --from=build /app/.next/standalone ./
# Copy static files
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Copy scripts directory
COPY --chown=app:app scripts ./scripts
# Copy next config
COPY --chown=app:app next.config.js ./

# Switch back to root to change permissions and then back to app user
USER root
RUN chmod 555 ./scripts/*
USER app

# Expose port and define CMD
EXPOSE 3000
CMD ["/app/scripts/start.sh"]
