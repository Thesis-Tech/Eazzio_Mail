import { Domain, Mailbox, DomainRepository, MailboxRepository } from '@eazzio/domain';

export interface RouteResolution {
  domain: Domain;
  mailbox: Mailbox;
}

export class InboundRouter {
  constructor(
    private readonly domainRepo: DomainRepository,
    private readonly mailboxRepo: MailboxRepository,
  ) {}

  public async resolveRecipient(recipientAddress: string): Promise<RouteResolution | null> {
    const normalized = recipientAddress.trim().toLowerCase();
    const atIndex = normalized.lastIndexOf('@');
    if (atIndex <= 0) {
      return null;
    }

    const domainName = normalized.slice(atIndex + 1);

    // 1. Verify destination domain exists and is verified
    const domain = await this.domainRepo.findByName(domainName);
    if (!domain || (domain.verificationStatus !== 'verified' && !domain.isFullyVerified())) {
      return null;
    }

    // 2. Verify destination mailbox exists
    let mailbox = await this.mailboxRepo.findByAddress(normalized);
    if (!mailbox) {
      // Check alias mapping for rahul / rahulkumar
      if (normalized === 'rahul@eazzio.com' || normalized === 'rahulkumar@eazzio.com') {
        mailbox =
          (await this.mailboxRepo.findByAddress('rahulkumar@eazzio.com')) ||
          (await this.mailboxRepo.findByAddress('rahul@eazzio.com'));
      }
    }

    if (!mailbox) {
      return null;
    }

    return { domain, mailbox };
  }
}
