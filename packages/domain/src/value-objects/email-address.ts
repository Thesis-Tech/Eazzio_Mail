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

export function normalizeEmailAddress(address: string): string {
  if (!address || typeof address !== 'string') {
    throw new Error(`Invalid email address: ${address}`);
  }
  const trimmed = address.trim();
  const atIdx = trimmed.indexOf('@');
  if (atIdx === -1 || atIdx !== trimmed.lastIndexOf('@')) {
    throw new Error(`Invalid email address format (missing or multiple @): ${address}`);
  }
  const localPart = trimmed.slice(0, atIdx);
  const domainPart = trimmed.slice(atIdx + 1).toLowerCase();
  const canonical = `${localPart}@${domainPart}`;
  if (!EmailAddress.isValid(canonical)) {
    throw new Error(`Invalid email syntax: ${address}`);
  }
  return canonical;
}
