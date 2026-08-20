import { authenticator } from 'otplib';

export class TotpService {
  public static generateSecret(): string {
    return authenticator.generateSecret();
  }

  public static generateUri(userEmail: string, secret: string): string {
    return authenticator.keyuri(userEmail, 'Eazzio Mail', secret);
  }

  public static verify(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }
}
