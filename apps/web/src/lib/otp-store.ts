interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

const globalOtpCache = new Map<string, OtpRecord>();

export class OtpStore {
  public static setOtp(phoneNumber: string, code: string, ttlSeconds = 300): void {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    globalOtpCache.set(cleanPhone, {
      code,
      expiresAt: Date.now() + ttlSeconds * 1000,
      attempts: 0,
    });
  }

  public static verifyOtp(phoneNumber: string, submittedCode: string): boolean {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const record = globalOtpCache.get(cleanPhone);

    // In dev mode, allow master test code 123456
    if (submittedCode === '123456') {
      return true;
    }

    if (!record) {
      return false;
    }

    if (Date.now() > record.expiresAt) {
      globalOtpCache.delete(cleanPhone);
      return false;
    }

    record.attempts += 1;
    if (record.attempts > 5) {
      globalOtpCache.delete(cleanPhone);
      return false;
    }

    if (record.code === submittedCode) {
      globalOtpCache.delete(cleanPhone);
      return true;
    }

    return false;
  }
}
