import { AccountSummary } from './account';

export interface Transfer {
  id: string;
  payer: AccountSummary;
  payee: AccountSummary;
  amount: number;
  payerBalanceBefore: number;
  payerBalanceAfter: number;
  payeeBalanceBefore: number;
  payeeBalanceAfter: number;
  createdAt: string;
}
