import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('stores the authenticated user and exposes the logged-in state', () => {
    service.update({
      id: 'user-id',
      email: 'user@auronix.com',
      name: 'Usuário',
      createdAt: '2026-03-29T00:00:00.000Z',
    });

    expect(service.data()).toEqual({
      id: 'user-id',
      email: 'user@auronix.com',
      name: 'Usuário',
      createdAt: '2026-03-29T00:00:00.000Z',
    });
    expect(service.isLoggedIn()).toBe(true);
  });

  it('stores the current account and exposes the balance', () => {
    service.updateAccount({
      id: 'account-id',
      balance: 15000,
      user: {
        id: 'user-id',
        email: 'user@auronix.com',
        name: 'Usuário',
        createdAt: '2026-03-29T00:00:00.000Z',
      },
    });

    expect(service.account()?.id).toBe('account-id');
    expect(service.balance()).toBe(15000);
  });

  it('clears the current session', () => {
    service.update({
      id: 'user-id',
      email: 'user@auronix.com',
      name: 'Usuário',
      createdAt: '2026-03-29T00:00:00.000Z',
    });
    service.updateAccount({
      id: 'account-id',
      balance: 15000,
      user: {
        id: 'user-id',
        email: 'user@auronix.com',
        name: 'Usuário',
        createdAt: '2026-03-29T00:00:00.000Z',
      },
    });

    service.clear();

    expect(service.data()).toBeNull();
    expect(service.account()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });
});
