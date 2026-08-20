import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    alias: {
      '@eazzio/domain': path.resolve(__dirname, './packages/domain/dist/index.js'),
      '@eazzio/contracts': path.resolve(__dirname, './packages/contracts/dist/index.js'),
      '@eazzio/infra-adapters': path.resolve(__dirname, './packages/infra-adapters/dist/index.js'),
      '@eazzio/security-pipeline': path.resolve(__dirname, './packages/security-pipeline/dist/index.js'),
      '@eazzio/ui-kit': path.resolve(__dirname, './packages/ui-kit/dist/index.js'),
      '@eazzio/identity': path.resolve(__dirname, './services/identity/dist/index.js'),
      '@eazzio/api': path.resolve(__dirname, './services/api/dist/index.js'),
      '@eazzio/mail-inbound': path.resolve(__dirname, './services/mail-inbound/dist/index.js'),
      '@eazzio/mail-outbound': path.resolve(__dirname, './services/mail-outbound/dist/index.js'),
      '@eazzio/search-indexer': path.resolve(__dirname, './services/search-indexer/dist/index.js'),
      '@eazzio/notification': path.resolve(__dirname, './services/notification/dist/index.js'),
      '@eazzio/admin-service': path.resolve(__dirname, './services/admin-service/dist/index.js'),
      '@eazzio/ai-gateway': path.resolve(__dirname, './services/ai-gateway/dist/index.js')
    }
  }
});
