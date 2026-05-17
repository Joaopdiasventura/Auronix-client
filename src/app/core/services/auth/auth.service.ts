import { computed, Injectable, signal } from '@angular/core';
import { Account } from '../../models/account';
import { User } from '../../models/user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly dataSource = signal<User | null>(null);
  private readonly accountSource = signal<Account | null>(null);
  public readonly data = this.dataSource.asReadonly();
  public readonly account = this.accountSource.asReadonly();
  public readonly isLoggedIn = computed(() => this.dataSource() != null);
  public readonly balance = computed(() => this.accountSource()?.balance ?? 0);

  public update(user: User | null): void {
    this.dataSource.set(user);
  }

  public updateAccount(account: Account | null): void {
    this.accountSource.set(account);
  }

  public clear(): void {
    this.dataSource.set(null);
    this.accountSource.set(null);
  }
}
