import {
  InboundMailProvider,
  ProviderConnectionTestResult,
  RawInboundEmail,
} from './inbound-provider.interface.js';

export class CloudflareEmailWorkerProvider implements InboundMailProvider {
  public readonly providerName = 'cloudflare';

  public async testConnection(): Promise<ProviderConnectionTestResult> {
    return {
      success: true,
      provider: this.providerName,
      message: 'Cloudflare Email Routing Worker endpoint is ready for HTTP webhook injection.',
    };
  }

  public async fetchNewMessages(_folder?: string, _limit?: number): Promise<RawInboundEmail[]> {
    // Cloudflare is push-based (webhooks arrive via POST /v1/messages/cloudflare-inbound)
    return [];
  }

  public async markSynchronized(_uid: string, _folder?: string): Promise<void> {
    // Push-based, no-op
  }
}
