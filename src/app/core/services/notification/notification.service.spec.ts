import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let eventSource: MockEventSource;
  let originalEventSource: typeof EventSource;

  beforeEach(() => {
    originalEventSource = globalThis.EventSource;
    globalThis.EventSource = MockEventSource as never;

    TestBed.configureTestingModule({
      providers: [NotificationService],
    });

    service = TestBed.inject(NotificationService);
    eventSource = MockEventSource.instances[0] ?? null!;
  });

  afterEach(() => {
    globalThis.EventSource = originalEventSource;
    MockEventSource.instances.length = 0;
  });

  it('parses transfer events from the SSE stream', async () => {
    service.start();
    const eventPromise = firstValueFrom(service.connect());
    eventSource = MockEventSource.instances[0];

    eventSource.emit('transaction.completed', {
      data: JSON.stringify({
        transactionId: 'transfer-id',
        amount: 5000,
        payerAccountId: 'payer-account-id',
        payeeAccountId: 'payee-account-id',
        createdAt: '2026-03-29T00:00:00.000Z',
        type: 'transaction.completed',
      }),
      lastEventId: '42',
    });

    await expect(eventPromise).resolves.toEqual({
      id: '42',
      type: 'transaction.completed',
      data: {
        transactionId: 'transfer-id',
        amount: 5000,
        payerAccountId: 'payer-account-id',
        payeeAccountId: 'payee-account-id',
        createdAt: '2026-03-29T00:00:00.000Z',
        type: 'transaction.completed',
      },
    });
  });

  it('keeps a single EventSource instance while started', () => {
    service.start();
    service.start();

    expect(MockEventSource.instances).toHaveLength(1);
  });

  it('closes the current stream when stopped', () => {
    service.start();
    eventSource = MockEventSource.instances[0];

    service.stop();

    expect(eventSource.closed).toBe(true);
  });
});

class MockEventSource {
  public static readonly instances: MockEventSource[] = [];

  public closed = false;
  public readonly listeners = new Map<string, EventListener[]>();
  public readonly readyState = 1;
  public onerror: ((this: EventSource, event: Event) => unknown) | null = null;

  public constructor(
    public readonly url: string,
    public readonly init?: EventSourceInit,
  ) {
    MockEventSource.instances.push(this);
  }

  public addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  public removeEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      listeners.filter((item) => item != listener),
    );
  }

  public close(): void {
    this.closed = true;
  }

  public emit(
    type: string,
    init: {
      data: string;
      lastEventId: string;
    },
  ): void {
    const event = new MessageEvent(type, init);
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}
