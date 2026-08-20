export interface EazzioEmailTransport {
  submitOutbound(rawMime: Buffer, envelopeFrom: string, envelopeTo: string[]): Promise<{ queueId: string }>;
  getDeliveryStatus(queueId: string): Promise<{ state: string; detail?: string }>;
}
