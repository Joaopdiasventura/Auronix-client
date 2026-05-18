import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PaymentRequest } from '../../../core/models/payment-request';
import { AuthService } from '../../../core/services/auth/auth.service';
import { PaymentRequestService } from '../../../core/services/payment-request/payment-request.service';
import { PageHeader } from '../../../shared/components/ui/page-header/page-header';
import { Skeleton } from '../../../shared/components/ui/skeleton/skeleton';
import { SkeletonReadonlyGrid } from '../../../shared/components/ui/skeleton/skeleton-readonly-grid';
import { StatusChip } from '../../../shared/components/ui/status-chip/status-chip';
import { PageFeedbackState } from '../../../shared/view-models/ui';
import { formatCurrency } from '../../../shared/utils/format-currency';
import { formatDateTime } from '../../../shared/utils/format-date-time';
import { httpErrorMessage } from '../../../shared/utils/http-error-message';

@Component({
  selector: 'app-payment-request-details-page',
  imports: [PageHeader, RouterLink, Skeleton, SkeletonReadonlyGrid, StatusChip],
  templateUrl: './details-page.html',
  styleUrl: './details-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentRequestDetailsPage {
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isAuthenticated = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly paymentRequest = signal<PaymentRequest | null>(null);
  protected readonly requestId = inject(ActivatedRoute).snapshot.paramMap.get('id') || '';

  private readonly authService = inject(AuthService);
  private readonly paymentRequestService = inject(PaymentRequestService);

  protected readonly availabilityLabel = computed(() => {
    if (this.canCreateTransfer()) return 'Cobrança disponível';
    if (this.isOwnPaymentRequest()) return 'Pronto para compartilhamento';
    return 'Aguardando validação';
  });
  protected readonly availabilityTone = computed<'info' | 'success' | 'warning'>(() => {
    if (this.canCreateTransfer()) return 'success';
    if (this.isOwnPaymentRequest()) return 'info';
    return 'warning';
  });
  protected readonly canCreateTransfer = computed(() => {
    const paymentRequest = this.paymentRequest();
    const currentUserId = this.authService.data()?.id;

    if (!paymentRequest?.account?.id || !currentUserId) return false;

    return paymentRequest.account.id != this.authService.account()?.id;
  });
  protected readonly feedbackState = computed<PageFeedbackState | null>(() => {
    if (!this.isLoading() && !this.isAuthenticated()) {
      return {
        description:
          'O identificador da cobrança existe, mas a leitura completa depende de uma sessão autenticada.',
        title: 'Entre para validar esta cobrança',
        tone: 'info',
      };
    }

    const errorMessage = this.errorMessage();
    if (!this.isLoading() && errorMessage) {
      return {
        description: errorMessage,
        title: 'Não foi possível carregar esta cobrança',
        tone: 'danger',
      };
    }

    return null;
  });
  protected readonly isOwnPaymentRequest = computed(() => {
    const paymentRequest = this.paymentRequest();
    const currentUserId = this.authService.data()?.id;

    if (!paymentRequest?.account?.id || !currentUserId) return false;

    return paymentRequest.account.id == this.authService.account()?.id;
  });
  protected readonly requesterName = computed(
    () => this.paymentRequest()?.account.name || 'Conta protegida',
  );
  protected readonly requestMetaSkeletonLabelWidths = ['7rem', '6rem', '4.75rem', '8rem'];
  protected readonly requestMetaSkeletonValueWidths = ['10rem', '12rem', '9rem', '10rem'];
  protected readonly shouldShowSkeleton = computed(
    () => this.isLoading() && this.paymentRequest() == null,
  );

  public constructor() {
    if (this.authService.isLoggedIn()) {
      this.isAuthenticated.set(true);
      this.loadPaymentRequest();
      return;
    }

    this.isLoading.set(false);
  }

  protected formatCreatedAt(value: string): string {
    return formatDateTime(value);
  }

  protected formatValue(value: number): string {
    return formatCurrency(value);
  }

  private loadPaymentRequest(): void {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.paymentRequestService.findById(this.requestId).subscribe({
      next: (paymentRequest) => {
        this.paymentRequest.set(paymentRequest);
        this.isLoading.set(false);
      },
      error: ({ error, status }) => {
        if (status == 403) {
          this.authService.clear();
          this.isAuthenticated.set(false);
          this.isLoading.set(false);
          return;
        }

        this.errorMessage.set(httpErrorMessage(error, 'Não foi possível validar esta cobrança'));
        this.isLoading.set(false);
      },
    });
  }
}
