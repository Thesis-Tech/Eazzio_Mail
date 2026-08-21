import '../env.js';
import { PostgresAdapter, OpenSearchAdapter } from '@eazzio/infra-adapters';

export const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://eazzio_user:eazzio_password@localhost:5432/eazzio_mail',
  opensearchUrl: process.env.OPENSEARCH_URL || 'http://localhost:9200',
  jwtSecret: process.env.JWT_SECRET || 'eazzio_development_secret_key_minimum_32_bytes_long',
};

export const defaultDb = new PostgresAdapter(config.databaseUrl);
export const defaultOpenSearch = new OpenSearchAdapter(config.opensearchUrl);
