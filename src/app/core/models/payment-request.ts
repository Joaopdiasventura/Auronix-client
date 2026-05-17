import { AccountSummary } from './account';

export interface PaymentRequest {
  id: string;
  value: number;
  account: AccountSummary;
  createdAt: string;
}
