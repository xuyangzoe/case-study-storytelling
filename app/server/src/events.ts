import type { Response } from 'express';

interface Subscriber {
  householdId: string;
  res: Response;
}

/**
 * Server-sent events keep every household member's screen in sync.
 *
 * The PRD asks for "one shared, real-time inventory": when one member adjusts a
 * count, everyone else's view should follow without a manual refresh. Payloads
 * stay tiny — clients are told *that* something changed and refetch.
 */
export class EventHub {
  private subscribers = new Set<Subscriber>();
  private heartbeat: NodeJS.Timeout | null = null;

  subscribe(householdId: string, res: Response): () => void {
    const subscriber: Subscriber = { householdId, res };
    this.subscribers.add(subscriber);
    this.ensureHeartbeat();
    return () => {
      this.subscribers.delete(subscriber);
      if (this.subscribers.size === 0) this.stopHeartbeat();
    };
  }

  broadcast(householdId: string, event: { type: string; [key: string]: unknown }): void {
    const payload = `data: ${JSON.stringify({ ...event, at: new Date().toISOString() })}\n\n`;
    for (const subscriber of this.subscribers) {
      if (subscriber.householdId !== householdId) continue;
      subscriber.res.write(payload);
    }
  }

  /** Comment frames stop idle proxies from closing the stream. */
  private ensureHeartbeat(): void {
    if (this.heartbeat) return;
    this.heartbeat = setInterval(() => {
      for (const subscriber of this.subscribers) subscriber.res.write(': ping\n\n');
    }, 25_000);
    this.heartbeat.unref?.();
  }

  private stopHeartbeat(): void {
    if (!this.heartbeat) return;
    clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  closeAll(): void {
    for (const subscriber of this.subscribers) subscriber.res.end();
    this.subscribers.clear();
    this.stopHeartbeat();
  }
}
