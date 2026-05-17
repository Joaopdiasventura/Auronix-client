import { User } from './user';

export interface Account {
  id: string;
  balance: number;
  user: User;
  version?: number;
}

export interface AccountSummary {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}
