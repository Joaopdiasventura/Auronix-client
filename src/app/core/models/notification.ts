import { NotificationEventType } from '../enums/notification/notification-event-type.enum';

export interface TransferCompletedNotificationData {
  transactionId: string;
  amount: number;
  payerAccountId: string;
  payeeAccountId: string;
  createdAt: string;
  type: string;
}

export interface NotificationEventDataMap {
  [NotificationEventType.TransferCompleted]: TransferCompletedNotificationData;
}

export interface NotificationStreamEvent<T extends NotificationEventType = NotificationEventType> {
  id: string;
  type: T;
  data: NotificationEventDataMap[T];
}
