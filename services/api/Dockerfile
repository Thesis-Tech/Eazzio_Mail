# Multi-stage production build for Eazzio Mail Backend API
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
WORKDIR /app

# Step 1: Install dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/domain/package.json ./packages/domain/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/ui-kit/package.json ./packages/ui-kit/
COPY packages/infra-adapters/package.json ./packages/infra-adapters/
COPY packages/security-pipeline/package.json ./packages/security-pipeline/
COPY services/identity/package.json ./services/identity/
COPY services/mail-inbound/package.json ./services/mail-inbound/
COPY services/mail-outbound/package.json ./services/mail-outbound/
COPY services/notification/package.json ./services/notification/
COPY services/ai-gateway/package.json ./services/ai-gateway/
COPY services/search-indexer/package.json ./services/search-indexer/
COPY services/admin-service/package.json ./services/admin-service/
COPY services/api/package.json ./services/api/
COPY apps/web/package.json ./apps/web/
COPY apps/admin/package.json ./apps/admin/

RUN pnpm install --frozen-lockfile

# Step 2: Copy source and build packages & API service
COPY tsconfig.json ./
COPY packages/ ./packages/
COPY services/ ./services/
COPY scripts/ ./scripts/

# Build internal packages & API
RUN pnpm --filter @eazzio/domain build && \
    pnpm --filter @eazzio/contracts build && \
    pnpm --filter @eazzio/ui-kit build && \
    pnpm --filter @eazzio/security-pipeline build && \
    pnpm --filter @eazzio/infra-adapters build && \
    pnpm --filter @eazzio/identity build && \
    pnpm --filter @eazzio/notification build && \
    pnpm --filter @eazzio/mail-inbound build && \
    pnpm --filter @eazzio/mail-outbound build && \
    pnpm --filter @eazzio/search-indexer build && \
    pnpm --filter @eazzio/ai-gateway build && \
    pnpm --filter @eazzio/api build

# Step 3: Runner image
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

COPY --from=base /app /app

EXPOSE 8080

CMD ["pnpm", "--filter", "@eazzio/api", "start"]
