import { Injectable } from '@angular/core';
import { Observable, Observer, Subject } from 'rxjs';
import { NotificationEventType } from '../../enums/notification/notification-event-type.enum';
import { NotificationEventDataMap, NotificationStreamEvent } from '../../models/notification';

declare const API_URL: string;

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly streamUrl = API_URL + '/notifications/stream';
  private readonly eventsSource = new Subject<NotificationStreamEvent>();
  private eventSource: EventSource | null = null;
  private listeners: {
    eventType: NotificationEventType;
    listener: EventListener;
  }[] = [];

  public connect(): Observable<NotificationStreamEvent> {
    return this.eventsSource.asObservable();
  }

  public start(): void {
    if (this.eventSource || typeof EventSource == 'undefined') return;

    const eventSource = new EventSource(this.streamUrl, { withCredentials: true });
    this.listeners = Object.values(NotificationEventType).map((eventType) =>
      this.registerListener(eventSource, eventType, this.eventsSource),
    );

    eventSource.onerror = (): void => {
      if (eventSource.readyState != EventSource.CLOSED) return;
      this.teardown();
    };

    this.eventSource = eventSource;
  }

  public stop(): void {
    this.teardown();
  }

  private registerListener(
    eventSource: EventSource,
    eventType: NotificationEventType,
    subscriber: Observer<NotificationStreamEvent>,
  ): {
    eventType: NotificationEventType;
    listener: EventListener;
  } {
    const listener: EventListener = (event) => {
      if (!(event instanceof MessageEvent) || typeof event.data != 'string') return;

      const parsedEvent = this.parseEvent(eventType, event.lastEventId, event.data);
      if (!parsedEvent) return;

      subscriber.next(parsedEvent);
    };

    eventSource.addEventListener(eventType, listener);
    return { eventType, listener };
  }

  private parseEvent<T extends NotificationEventType>(
    eventType: T,
    id: string,
    data: string,
  ): NotificationStreamEvent<T> | null {
    try {
      const payload = JSON.parse(data) as NotificationEventDataMap[T];
      return {
        id,
        type: eventType,
        data: payload,
      };
    } catch {
      return null;
    }
  }

  private teardown(): void {
    if (!this.eventSource) return;

    for (const { eventType, listener } of this.listeners)
      this.eventSource.removeEventListener(eventType, listener);

    this.eventSource.close();
    this.eventSource = null;
    this.listeners = [];
  }
}
