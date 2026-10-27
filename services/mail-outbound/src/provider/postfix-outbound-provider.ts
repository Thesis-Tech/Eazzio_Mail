import { EazzioEmailTransport } from '@eazzio/infra-adapters';
import {
  OutboundMailProvider,
  OutboundMessagePayload,
  OutboundSendResult,
} from './outbound-provider.interface.js';

/**
 * Default Postfix / MTA Outbound Provider.
 * Wraps existing EazzioEmailTransport submission unchanged.
 */
export class PostfixOutboundProvider implements OutboundMailProvider {
  public readonly providerName = 'postfix';

  constructor(private readonly transport: EazzioEmailTransport) {}

  public async send(message: OutboundMessagePayload): Promise<OutboundSendResult> {
    try {
      const res = await this.transport.submitOutbound(message.rawMime, message.fromAddress, [
        message.recipientAddress,
      ]);
      return {
        success: true,
        messageId: message.messageId,
        queueId: res.queueId,
      };
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || 'Postfix submission error';
      return {
        success: false,
        messageId: message.messageId,
        error: errorMsg,
        smtpCode: errorMsg,
      };
    }
  }
}
