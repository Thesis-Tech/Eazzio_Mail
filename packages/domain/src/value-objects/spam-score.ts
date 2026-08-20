export class SpamScore {
  private readonly _score: number;

  constructor(score: number) {
    if (isNaN(score)) {
      throw new Error('Spam score must be a valid number');
    }
    this._score = Math.max(0, Math.min(1, score));
  }

  public get value(): number {
    return this._score;
  }

  public isReject(threshold: number = 0.95): boolean {
    return this._score >= threshold;
  }

  public isQuarantine(threshold: number = 0.6): boolean {
    return this._score >= threshold;
  }
}
