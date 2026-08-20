export class Quota {
  private readonly _quotaBytes: bigint;
  private readonly _usedBytes: bigint;

  constructor(quotaBytes: bigint, usedBytes: bigint = 0n) {
    if (quotaBytes <= 0n) {
      throw new Error('Quota bytes must be greater than zero');
    }
    if (usedBytes < 0n) {
      throw new Error('Used bytes cannot be negative');
    }
    this._quotaBytes = quotaBytes;
    this._usedBytes = usedBytes;
  }

  public get quotaBytes(): bigint {
    return this._quotaBytes;
  }

  public get usedBytes(): bigint {
    return this._usedBytes;
  }

  public get remainingBytes(): bigint {
    return this._quotaBytes > this._usedBytes ? this._quotaBytes - this._usedBytes : 0n;
  }

  public isExceeded(additionalBytes: number = 0): boolean {
    return this._usedBytes + BigInt(additionalBytes) > this._quotaBytes;
  }
}
