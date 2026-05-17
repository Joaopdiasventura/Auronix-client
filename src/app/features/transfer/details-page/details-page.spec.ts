import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../core/services/auth/auth.service';
import { NotificationService } from '../../../core/services/notification/notification.service';
import { TransferService } from '../../../core/services/transfer/transfer.service';
import { TransferDetailsPage } from './details-page';

describe('TransferDetailsPage', () => {
  let fixture: ComponentFixture<TransferDetailsPage>;
  let transferRefresh$: Subject<{ data: { transactionId: string } }>;

  const transferDetails = {
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
  };

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
    findById: vi.fn(),
  };

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [TransferDetailsPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'transfer-id' }),
            },
          },
        },
        { provide: AuthService, useValue: authService },
        { provide: NotificationService, useValue: notificationService },
        { provide: TransferService, useValue: transferService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransferDetailsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();

    transferRefresh$ = new Subject();
    notificationService.connect.mockReturnValue(transferRefresh$.asObservable());
    transferService.findById.mockReturnValue(of(transferDetails));
  });

  it('renders the transfer summary and status', async () => {
    await createComponent();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain('Transferência enviada');
    expect(nativeElement.textContent).toContain('Concluída');
  });

  it('renders the structural skeleton while the transfer is loading', async () => {
    const transferResponse$ = new Subject<typeof transferDetails>();
    transferService.findById.mockReturnValue(transferResponse$.asObservable());

    await createComponent();

    let nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('app-skeleton-timeline')).not.toBeNull();
    expect(nativeElement.querySelector('app-skeleton-readonly-grid')).not.toBeNull();
    expect(nativeElement.querySelector('.page-shell')?.getAttribute('aria-busy')).toBe('true');

    transferResponse$.next(transferDetails);
    transferResponse$.complete();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('app-skeleton-timeline')).toBeNull();
    expect(nativeElement.querySelector('.page-shell')?.hasAttribute('aria-busy')).toBe(false);
    expect(nativeElement.textContent).toContain('Transferência enviada');
  });

  it('keeps the current transfer visible during matching background refreshes', async () => {
    const refreshResponse$ = new Subject<typeof transferDetails>();
    transferService.findById
      .mockReturnValueOnce(of(transferDetails))
      .mockReturnValueOnce(refreshResponse$.asObservable());

    await createComponent();

    transferRefresh$.next({
      data: {
        transactionId: 'transfer-id',
      },
    });
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(transferService.findById).toHaveBeenCalledTimes(2);
    expect(nativeElement.textContent).toContain('Transferência enviada');
    expect(nativeElement.querySelector('app-skeleton-timeline')).toBeNull();
    expect(nativeElement.querySelector('.page-shell')?.hasAttribute('aria-busy')).toBe(false);
  });

  it('renders incoming transfer copy', async () => {
    await createComponent();

    fixture.componentInstance['transfer'].set({
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
    });
    fixture.componentInstance['isLoading'].set(false);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Transferência recebida');
  });
});
