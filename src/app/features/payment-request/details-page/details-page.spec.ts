import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../core/services/auth/auth.service';
import { PaymentRequestService } from '../../../core/services/payment-request/payment-request.service';
import { PaymentRequestDetailsPage } from './details-page';

describe('PaymentRequestDetailsPage', () => {
  let fixture: ComponentFixture<PaymentRequestDetailsPage>;

  const paymentRequestResponse = {
    id: 'request-id',
    value: 2500,
    createdAt: '2026-03-29T10:00:00.000Z',
    account: {
      id: 'payee-account-id',
      email: 'maria@auronix.com',
      name: 'Maria',
      createdAt: '2026-03-29T00:00:00.000Z',
    },
  };

  const authService = {
    clear: vi.fn(),
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
    isLoggedIn: vi.fn(() => false),
    update: vi.fn(),
  };

  const paymentRequestService = {
    findById: vi.fn(),
  };

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [PaymentRequestDetailsPage],
      providers: [
        provideRouter([{ path: 'payment-request/:id', component: PaymentRequestDetailsPage }]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'request-id' }),
            },
          },
        },
        { provide: AuthService, useValue: authService },
        { provide: PaymentRequestService, useValue: paymentRequestService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentRequestDetailsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    authService.isLoggedIn.mockReturnValue(false);
  });

  it('shows the login prompt when no authenticated session exists', async () => {
    await createComponent();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Entre para validar esta cobrança',
    );
  });

  it('renders the structural skeleton while the request is loading', async () => {
    const paymentRequestLoading$ = new Subject<typeof paymentRequestResponse>();
    authService.isLoggedIn.mockReturnValue(true);
    paymentRequestService.findById.mockReturnValue(paymentRequestLoading$.asObservable());

    await createComponent();

    let nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.page-shell')?.getAttribute('aria-busy')).toBe('true');
    expect(nativeElement.querySelector('app-skeleton-readonly-grid')).not.toBeNull();
    expect(nativeElement.querySelector('.request-summary__value')).toBeNull();

    paymentRequestLoading$.next(paymentRequestResponse);
    paymentRequestLoading$.complete();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.page-shell')?.hasAttribute('aria-busy')).toBe(false);
    expect(nativeElement.querySelector('app-skeleton-readonly-grid')).toBeNull();
    expect(nativeElement.textContent).toContain('Maria');
  });

  it('shows the payment call to action for a third-party request', async () => {
    authService.isLoggedIn.mockReturnValue(true);
    paymentRequestService.findById.mockReturnValue(of(paymentRequestResponse));

    await createComponent();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain('Maria');
    expect(nativeElement.textContent).toContain('Pagar cobrança');
  });
});
