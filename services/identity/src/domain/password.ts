import * as argon2 from 'argon2';

export class PasswordService {
  public static async hash(password: string): Promise<string> {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });
  }

  public static async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
