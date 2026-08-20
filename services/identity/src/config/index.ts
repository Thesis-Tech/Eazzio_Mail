export interface IdentityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  minPasswordLength: number;
}

export const identityConfig: IdentityConfig = {
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_jwt_key_must_change_in_prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  minPasswordLength: 12,
};
