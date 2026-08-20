import { EmailAddress } from '@eazzio/domain';

export interface InboundEnvelopeProps {
  envelopeFrom: string;
  envelopeTo: string[];
  clientIp: string;
  tlsVersion?: string;
  sizeBytes: number;
}

export class InboundEnvelope {
  public readonly from: EmailAddress;
  public readonly to: EmailAddress[];

  constructor(public readonly props: InboundEnvelopeProps) {
    this.from = new EmailAddress(props.envelopeFrom);
    this.to = props.envelopeTo.map((addr) => new EmailAddress(addr));

    if (props.sizeBytes > 26214400) {
      // 25MB max size
      throw new Error('Message size exceeds maximum limit of 25MB');
    }
  }
}
