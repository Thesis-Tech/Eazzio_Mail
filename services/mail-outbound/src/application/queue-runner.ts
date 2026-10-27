import { OutboundQueueRepository } from '../repositories/outbound-queue-repository.js';
import { MessageRepository } from '@eazzio/domain';
import { EazzioStorage, EazzioEmailTransport } from '@eazzio/infra-adapters';
import { OutboundService } from './outbound-service.js';
import { MailDeliveredEvent, MailBouncedEvent } from '@eazzio/contracts';
import { OutboundMailProvider } from '../provider/outbound-provider.interface.js';
import { OutboundProviderFactory } from '../provider/outbound-provider-factory.js';

export interface BatchProcessingResult {
  processed: number;
  delivered: number;
  retried: number;
  bounced: number;
  events: Array<MailDeliveredEvent | MailBouncedEvent>;
}

export class QueueRunner {
  private readonly provider: OutboundMailProvider;

  constructor(
    private readonly queueRepo: OutboundQueueRepository,
    private readonly messageRepo: MessageRepository,
    private readonly storage: EazzioStorage,
    transportOrProvider?: EazzioEmailTransport | OutboundMailProvider,
  ) {
    if (transportOrProvider && 'send' in transportOrProvider) {
      this.provider = transportOrProvider;
    } else {
      this.provider = OutboundProviderFactory.createProvider(
        undefined,
        transportOrProvider as EazzioEmailTransport | undefined,
      );
    }
  }

  public async processNextBatch(batchSize: number = 20): Promise<BatchProcessingResult> {
    const pendingItems = await this.queueRepo.fetchPending(batchSize);
    const result: BatchProcessingResult = {
      processed: pendingItems.length,
      delivered: 0,
      retried: 0,
      bounced: 0,
      events: [],
    };

    for (const item of pendingItems) {
      const message = await this.messageRepo.findById(item.messageId);
      if (!message) {
        // Message was deleted or not found: mark bounced
        await this.queueRepo.updateState(
          item.id,
          'bounced',
          item.attemptCount + 1,
          new Date(),
          'Message record not found',
        );
        result.bounced++;
        continue;
      }

      let rawMime: Buffer;
      try {
        rawMime = await this.storage.get(message.rawObjectKey);
      } catch (err: unknown) {
        const errorMsg = (err as Error).message || 'Raw MIME not found in storage';
        await this.queueRepo.updateState(
          item.id,
          'bounced',
          item.attemptCount + 1,
          new Date(),
          errorMsg,
        );
        result.bounced++;
        continue;
      }

      let deliverySuccess = false;
      let smtpErrorDetail: string | undefined;

      try {
        const sendResult = await this.provider.send({
          messageId: message.id,
          fromAddress: message.fromAddress,
          recipientAddress: item.recipientAddress,
          rawMime,
          subject: message.subject,
          bodyHtml: message.bodyHtml,
          bodyText: message.bodyText,
        });

        if (sendResult.success) {
          deliverySuccess = true;
        } else {
          deliverySuccess = false;
          smtpErrorDetail = sendResult.error || 'Outbound Delivery Failed';
        }
      } catch (err: unknown) {
        deliverySuccess = false;
        smtpErrorDetail = (err as Error).message || 'Outbound Provider Error';
      }

      const attemptResult = OutboundService.handleDeliveryAttempt({
        outboundQueueId: item.id,
        messageId: item.messageId,
        recipientAddress: item.recipientAddress,
        currentAttempts: item.attemptCount + 1,
        success: deliverySuccess,
        smtpCode: smtpErrorDetail,
      });

      if (attemptResult.state === 'delivered') {
        await this.queueRepo.updateState(
          item.id,
          'delivered',
          item.attemptCount + 1,
          new Date(),
          null,
        );
        await this.messageRepo.updateDeliveryState(item.messageId, 'delivered');
        result.delivered++;
        if (attemptResult.event) result.events.push(attemptResult.event);
      } else if (attemptResult.state === 'bounced') {
        await this.queueRepo.updateState(
          item.id,
          'bounced',
          item.attemptCount + 1,
          new Date(),
          smtpErrorDetail,
        );
        await this.messageRepo.updateDeliveryState(item.messageId, 'bounced');
        result.bounced++;
        if (attemptResult.event) result.events.push(attemptResult.event);
      } else {
        // Retrying with exponential backoff
        await this.queueRepo.updateState(
          item.id,
          'retrying',
          item.attemptCount + 1,
          attemptResult.nextAttemptAt || new Date(Date.now() + 30000),
          smtpErrorDetail,
        );
        await this.messageRepo.updateDeliveryState(item.messageId, 'retrying');
        result.retried++;
        if (attemptResult.event) result.events.push(attemptResult.event);
      }
    }

    return result;
  }
}
