import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/services/auth/auth.service';
import { NotificationService } from '../../core/services/notification/notification.service';
import { TransferService } from '../../core/services/transfer/transfer.service';
import { HomePage } from './home-page';

describe('HomePage', () => {
  let fixture: ComponentFixture<HomePage>;
  let dashboardRefresh$: Subject<unknown>;

  const dashboardTransfers = [
    {
      id: 'transfer-id',
      amount: 5000,
      payerBalanceBefore: 100000,
      payerBalanceAfter: 95000,
      payeeBalanceBefore: 120000,
      payeeBalanceAfter: 125000,
      createdAt: '2026-03-29T09:58:00.000Z',
      payer: { id: 'account-id', email: 'joao@auronix.com', name: 'Joao', createdAt: '2026-03-29T00:00:00.000Z' },
      payee: { id: 'payee-id', email: 'maria@auronix.com', name: 'Maria', createdAt: '2026-03-29T00:00:00.000Z' },
    },
    {
      id: 'transfer-id-2',
      amount: 3500,
      payerBalanceBefore: 100000,
      payerBalanceAfter: 96500,
      payeeBalanceBefore: 120000,
      payeeBalanceAfter: 123500,
      createdAt: '2026-03-29T15:58:00.000Z',
      payer: { id: 'payer-id', email: 'carlos@auronix.com', name: 'Carlos', createdAt: '2026-03-29T00:00:00.000Z' },
      payee: { id: 'account-id', email: 'joao@auronix.com', name: 'Joao', createdAt: '2026-03-29T00:00:00.000Z' },
    },
    {
      id: 'transfer-id-3',
      amount: 2200,
      payerBalanceBefore: 100000,
      payerBalanceAfter: 97800,
      payeeBalanceBefore: 120000,
      payeeBalanceAfter: 122200,
      createdAt: '2026-03-30T09:58:00.000Z',
      payer: { id: 'payer-id-2', email: 'ana@auronix.com', name: 'Ana', createdAt: '2026-03-29T00:00:00.000Z' },
      payee: { id: 'account-id', email: 'joao@auronix.com', name: 'Joao', createdAt: '2026-03-29T00:00:00.000Z' },
    },
  ];

  const authService = {
    account: signal({
      id: 'account-id',
      balance: 125000,
      user: {
        id: 'user-id',
        email: 'joao@auronix.com',
        name: 'Joao',
        createdAt: '2026-03-29T00:00:00.000Z',
      },
    }),
    balance: vi.fn(() => 125000),
    data: signal({
      id: 'user-id',
      email: 'joao@auronix.com',
      name: 'Joao',
      createdAt: '2026-03-29T00:00:00.000Z',
    }),
    clear: vi.fn(),
    isLoggedIn: (): boolean => true,
    update: vi.fn((user) => authService.data.set(user)),
  };

  const notificationService = {
    connect: vi.fn(),
  };

  const transferService = {
    findMany: vi.fn(),
  };

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: NotificationService, useValue: notificationService },
        { provide: TransferService, useValue: transferService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();

    dashboardRefresh$ = new Subject();
    notificationService.connect.mockReturnValue(dashboardRefresh$.asObservable());
    transferService.findMany.mockReturnValue(
      of({
        content: dashboardTransfers,
      }),
    );
  });

  it('renders the user name and latest transfer', async () => {
    await createComponent();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain('Olá, Joao');
    expect(nativeElement.textContent).toContain('Transferência liquidada');
    expect(nativeElement.querySelector('.dashboard-ledger')).not.toBeNull();
  });

  it('renders the structural skeleton while the dashboard request is pending', async () => {
    const dashboardResponse$ = new Subject<{ content: typeof dashboardTransfers }>();
    transferService.findMany.mockReturnValue(dashboardResponse$.asObservable());

    await createComponent();

    let nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('app-skeleton-metric-card')).not.toBeNull();
    expect(nativeElement.querySelector('app-skeleton-list-row')).not.toBeNull();
    expect(nativeElement.querySelector('.page-shell')?.getAttribute('aria-busy')).toBe('true');
    expect(nativeElement.textContent).not.toContain('Transferência liquidada');

    dashboardResponse$.next({ content: dashboardTransfers });
    dashboardResponse$.complete();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('app-skeleton-metric-card')).toBeNull();
    expect(nativeElement.querySelector('.page-shell')?.hasAttribute('aria-busy')).toBe(false);
    expect(nativeElement.textContent).toContain('Transferência liquidada');
  });

  it('keeps the rendered content visible during background refreshes', async () => {
    const refreshResponse$ = new Subject<{ content: typeof dashboardTransfers }>();
    transferService.findMany
      .mockReturnValueOnce(
        of({
          content: dashboardTransfers,
        }),
      )
      .mockReturnValueOnce(refreshResponse$.asObservable());

    await createComponent();

    dashboardRefresh$.next({});
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(transferService.findMany).toHaveBeenCalledTimes(2);
    expect(nativeElement.textContent).toContain('Transferência liquidada');
    expect(nativeElement.querySelector('app-skeleton-metric-card')).toBeNull();
    expect(nativeElement.querySelector('.page-shell')?.hasAttribute('aria-busy')).toBe(false);
  });
});
