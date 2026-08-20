export class MessageId {
  private readonly _id: string;

  constructor(id: string) {
    if (!id || id.trim().length === 0) {
      throw new Error('MessageId cannot be empty');
    }
    this._id = id.trim();
  }

  public get value(): string {
    return this._id;
  }

  public equals(other: MessageId): boolean {
    return this._id === other.value;
  }
}
