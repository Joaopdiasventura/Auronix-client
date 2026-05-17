import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Transfer } from '../../../core/models/transfer';
import { AuthService } from '../../../core/services/auth/auth.service';
import { NotificationService } from '../../../core/services/notification/notification.service';
import { TransferService } from '../../../core/services/transfer/transfer.service';
import { EmptyState } from '../../../shared/components/ui/empty-state/empty-state';
import { MetricCard } from '../../../shared/components/ui/metric-card/metric-card';
import { PageHeader } from '../../../shared/components/ui/page-header/page-header';
import { Skeleton } from '../../../shared/components/ui/skeleton/skeleton';
import { SkeletonListRow } from '../../../shared/components/ui/skeleton/skeleton-list-row';
import { SkeletonMetricCard } from '../../../shared/components/ui/skeleton/skeleton-metric-card';
import { DashboardMetric } from '../../../shared/view-models/ui';
import { formatCurrency } from '../../../shared/utils/format-currency';
import { formatDateTime } from '../../../shared/utils/format-date-time';
import { httpErrorMessage } from '../../../shared/utils/http-error-message';

@Component({
  selector: 'app-transfer-list-page',
  imports: [
    EmptyState,
    MetricCard,
    PageHeader,
    RouterLink,
    Skeleton,
    SkeletonListRow,
    SkeletonMetricCard,
  ],
  templateUrl: './list-page.html',
  styleUrl: './list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferListPage {
  private readonly pageSize = 8;
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly transferService = inject(TransferService);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly transfers = signal<Transfer[]>([]);

  protected readonly hasNextPage = computed(() => this.page() + 1 < this.totalPages());
  protected readonly hasPreviousPage = computed(() => this.page() > 0);
  protected readonly hasTransfers = computed(() => this.transfers().length > 0);
  protected readonly historySkeletonItems = Array.from(
    { length: this.pageSize },
    (_, index) => index,
  );
  protected readonly metricSkeletonItems = [0, 1, 2, 3];
  protected readonly pageMetrics = computed<DashboardMetric[]>(() => [
    {
      helper: 'Janela atual do extrato.',
      label: 'Página',
      tone: 'info',
      value: String(this.page() + 1).padStart(2, '0'),
    },
    {
      helper: 'Itens exibidos por consulta.',
      label: 'Capacidade',
      tone: 'neutral',
      value: String(this.pageSize).padStart(2, '0'),
    },
    {
      helper: 'Navegação para movimentos mais recentes.',
      label: 'Anterior',
      tone: this.hasPreviousPage() ? 'info' : 'neutral',
      value: this.hasPreviousPage() ? 'Disponível' : 'Início',
    },
    {
      helper: 'Continuidade do extrato após esta página.',
      label: 'Próxima',
      tone: this.hasNextPage() ? 'info' : 'neutral',
      value: this.hasNextPage() ? 'Disponível' : 'Fim',
    },
  ]);
  protected readonly shouldShowSkeleton = computed(
    () => this.isLoading() && this.transfers().length == 0,
  );

  public constructor() {
    this.loadTransfers();

    this.notificationService
      .connect()
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.loadTransfers(false));
  }

  public goToNextPage(): void {
    if (!this.hasNextPage()) return;

    this.page.update((value) => value + 1);
    this.loadTransfers();
  }

  public goToPreviousPage(): void {
    if (!this.hasPreviousPage()) return;

    this.page.update((value) => value - 1);
    this.loadTransfers();
  }

  protected formatAmount(transfer: Transfer): string {
    const sign = this.isOutgoingTransfer(transfer) ? '- ' : '+ ';
    return sign + formatCurrency(transfer.amount);
  }

  protected formatCompletedAt(transfer: Transfer): string {
    return formatDateTime(transfer.createdAt);
  }

  protected isOutgoingTransfer(transfer: Transfer): boolean {
    return transfer.payer.id == this.authService.account()?.id;
  }

  protected resolveCounterparty(transfer: Transfer): string {
    if (this.isOutgoingTransfer(transfer)) {
      return `Pago para ${transfer.payee.name || 'Conta protegida'}`;
    }

    return `Recebido de ${transfer.payer.name || 'Conta protegida'}`;
  }

  protected resolveDescription(transfer: Transfer): string {
    return this.isOutgoingTransfer(transfer) ? 'Transferência enviada' : 'Transferência recebida';
  }

  protected resolveNature(transfer: Transfer): string {
    return this.isOutgoingTransfer(transfer) ? 'Saída' : 'Entrada';
  }

  private loadTransfers(showLoading = true): void {
    if (showLoading) this.isLoading.set(true);
    this.errorMessage.set(null);

    this.transferService
      .findMany(this.page(), this.pageSize)
      .subscribe({
        next: ({ content, totalPages }) => {
          this.transfers.set(content);
          this.totalPages.set(totalPages);
          this.isLoading.set(false);
        },
        error: ({ error }) => {
          this.errorMessage.set(
            httpErrorMessage(error, 'Não foi possível carregar suas transferências'),
          );
          this.isLoading.set(false);
        },
      });
  }
}
