export class EmailAddress {
  private readonly _address: string;

  constructor(address: string) {
    const trimmed = address.trim().toLowerCase();
    if (!EmailAddress.isValid(trimmed)) {
      throw new Error(`Invalid email address: ${address}`);
    }
    this._address = trimmed;
  }

  public get value(): string {
    return this._address;
  }

  public get localPart(): string {
    return this._address.split('@')[0]!;
  }

  public get domain(): string {
    return this._address.split('@')[1]!;
  }

  public static isValid(address: string): boolean {
    const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return regex.test(address);
  }

  public equals(other: EmailAddress): boolean {
    return this._address === other.value;
  }
}
