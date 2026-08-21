import { authenticator } from 'otplib';

export class TotpService {
  public static generateSecret(): string {
    return authenticator.generateSecret();
  }

  public static generateUri(userEmail: string, secret: string): string {
    return authenticator.keyuri(userEmail, 'Eazzio Mail', secret);
  }

  public static generateOtpAuthUrl(userEmail: string, secret: string): string {
    return this.generateUri(userEmail, secret);
  }

  public static generateToken(secret: string): string {
    return authenticator.generate(secret);
  }

  public static verify(token: string, secret: string): boolean {
    authenticator.options = { window: 1 };
    return authenticator.verify({ token, secret });
  }
}
