import { MailSyncService } from './mail-sync-service.js';

export class InboundSyncScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly intervalSeconds: number;

  constructor(
    private readonly syncService: MailSyncService,
    intervalSeconds?: number
  ) {
    this.intervalSeconds =
      intervalSeconds ||
      Number(process.env.INBOUND_MAIL_POLL_INTERVAL || 60);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`⏱️ [InboundSyncScheduler] Started background inbound sync scheduler (Interval: ${this.intervalSeconds}s)`);

    // Initial sync after 3 seconds
    setTimeout(() => {
      if (this.isRunning) {
        this.runSyncCycle();
      }
    }, 3000);

    // Periodic schedule
    this.timer = setInterval(() => {
      this.runSyncCycle();
    }, this.intervalSeconds * 1000);
  }

  private async runSyncCycle(): Promise<void> {
    try {
      await this.syncService.sync();
    } catch (err: any) {
      console.warn(`[InboundSyncScheduler] Scheduled cycle notice: ${err.message}`);
    }
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('🛑 [InboundSyncScheduler] Stopped background inbound sync scheduler');
  }
}
