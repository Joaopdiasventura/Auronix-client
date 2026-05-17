import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../core/services/auth/auth.service';
import { NotificationService } from '../../../core/services/notification/notification.service';
import { TransferService } from '../../../core/services/transfer/transfer.service';
import { TransferListPage } from './list-page';

describe('TransferListPage', () => {
  let fixture: ComponentFixture<TransferListPage>;
  let transferRefresh$: Subject<unknown>;

  const transferPage = [
    {
      id: 'transfer-id',
      amount: 5000,
      payerBalanceBefore: 100000,
      payerBalanceAfter: 95000,
      payeeBalanceBefore: 120000,
      payeeBalanceAfter: 125000,
      createdAt: '2026-03-29T09:58:00.000Z',
      payer: {
        id: 'account-id',
        email: 'joao@auronix.com',
        name: 'Joao',
        createdAt: '2026-03-29T00:00:00.000Z',
      },
      payee: {
        id: 'payee-id',
        email: 'maria@auronix.com',
        name: 'Maria',
        createdAt: '2026-03-29T00:00:00.000Z',
      },
    },
  ];

  const authService = {
    account: signal({
      id: 'account-id',
      balance: 100000,
      user: {
        id: 'user-id',
        email: 'joao@auronix.com',
        name: 'Joao',
        createdAt: '2026-03-29T00:00:00.000Z',
      },
    }),
    data: signal({
      id: 'user-id',
      email: 'joao@auronix.com',
      name: 'Joao',
      createdAt: '2026-03-29T00:00:00.000Z',
    }),
  };

  const notificationService = {
    connect: vi.fn(),
  };

  const transferService = {
    findMany: vi.fn(),
  };

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [TransferListPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: NotificationService, useValue: notificationService },
        { provide: TransferService, useValue: transferService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransferListPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();

    transferRefresh$ = new Subject();
    notificationService.connect.mockReturnValue(transferRefresh$.asObservable());
    transferService.findMany.mockReturnValue(
      of({
        content: transferPage,
        number: 0,
        size: 8,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
        empty: false,
      }),
    );
  });

  it('renders the transfer summary', async () => {
    await createComponent();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Transferência enviada');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Maria');
  });

  it('renders the structural skeleton while the statement is loading', async () => {
    const transferResponse$ = new Subject<{
      content: typeof transferPage;
      totalPages: number;
    }>();
    transferService.findMany.mockReturnValue(transferResponse$.asObservable());

    await createComponent();

    let nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('app-skeleton-metric-card')).not.toBeNull();
    expect(nativeElement.querySelectorAll('app-skeleton-list-row')).toHaveLength(8);
    expect(nativeElement.querySelector('.page-shell')?.getAttribute('aria-busy')).toBe('true');

    transferResponse$.next({ content: transferPage, totalPages: 1 });
    transferResponse$.complete();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('app-skeleton-metric-card')).toBeNull();
    expect(nativeElement.querySelector('.page-shell')?.hasAttribute('aria-busy')).toBe(false);
    expect(nativeElement.textContent).toContain('Transferência enviada');
  });

  it('keeps the current rows visible during background refreshes', async () => {
    const refreshResponse$ = new Subject<{ content: typeof transferPage; totalPages: number }>();
    transferService.findMany
      .mockReturnValueOnce(
        of({
          content: transferPage,
          totalPages: 1,
        }),
      )
      .mockReturnValueOnce(refreshResponse$.asObservable());

    await createComponent();

    transferRefresh$.next({});
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(transferService.findMany).toHaveBeenCalledTimes(2);
    expect(nativeElement.textContent).toContain('Transferência enviada');
    expect(nativeElement.querySelector('app-skeleton-list-row')).toBeNull();
    expect(nativeElement.querySelector('.page-shell')?.hasAttribute('aria-busy')).toBe(false);
  });

  it('renders incoming transfer copy', async () => {
    await createComponent();

    fixture.componentInstance['transfers'].set([
      {
        id: 'transfer-id',
        amount: 5000,
        payerBalanceBefore: 100000,
        payerBalanceAfter: 95000,
        payeeBalanceBefore: 120000,
        payeeBalanceAfter: 125000,
        createdAt: '2026-03-29T09:58:00.000Z',
        payer: {
          id: 'payer-id',
          email: 'joao@auronix.com',
          name: 'Joao',
          createdAt: '2026-03-29T00:00:00.000Z',
        },
        payee: {
          id: 'account-id',
          email: 'maria@auronix.com',
          name: 'Maria',
          createdAt: '2026-03-29T00:00:00.000Z',
        },
      },
    ]);
    fixture.componentInstance['isLoading'].set(false);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Transferência recebida');
  });
});
