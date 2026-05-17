import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Transfer } from '../../core/models/transfer';
import { AuthService } from '../../core/services/auth/auth.service';
import { NotificationService } from '../../core/services/notification/notification.service';
import { TransferService } from '../../core/services/transfer/transfer.service';
import { EmptyState } from '../../shared/components/ui/empty-state/empty-state';
import { MetricCard } from '../../shared/components/ui/metric-card/metric-card';
import { PageHeader } from '../../shared/components/ui/page-header/page-header';
import { Skeleton } from '../../shared/components/ui/skeleton/skeleton';
import { SkeletonListRow } from '../../shared/components/ui/skeleton/skeleton-list-row';
import { SkeletonMetricCard } from '../../shared/components/ui/skeleton/skeleton-metric-card';
import { DashboardMetric } from '../../shared/view-models/ui';
import { formatCurrency } from '../../shared/utils/format-currency';
import { formatDateTime } from '../../shared/utils/format-date-time';
import { httpErrorMessage } from '../../shared/utils/http-error-message';

@Component({
  selector: 'app-home-page',
  imports: [
    EmptyState,
    MetricCard,
    PageHeader,
    RouterLink,
    Skeleton,
    SkeletonListRow,
    SkeletonMetricCard,
  ],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly transferService = inject(TransferService);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly transfers = signal<Transfer[]>([]);
  protected readonly user = this.authService.data;

  protected readonly balanceLabel = computed(() => formatCurrency(this.authService.balance()));
  protected readonly dashboardMetrics = computed<DashboardMetric[]>(() => {
    const incoming = this.transfers().reduce((sum, transfer) => {
      if (this.isOutgoingTransfer(transfer)) return sum;
      return sum + transfer.amount;
    }, 0);
    const outgoing = this.transfers().reduce((sum, transfer) => {
      if (!this.isOutgoingTransfer(transfer)) return sum;
      return sum + transfer.amount;
    }, 0);
    const net = incoming - outgoing;

    return [
      {
        helper: 'Saldo disponível para novas operações.',
        label: 'Saldo',
        tone: 'info',
        value: this.balanceLabel(),
      },
      {
        helper: 'Recebimentos concluídos na janela visível.',
        label: 'Entradas',
        tone: 'positive',
        value: formatCurrency(incoming),
      },
      {
        helper: 'Pagamentos concluídos na janela visível.',
        label: 'Saídas',
        tone: 'negative',
        value: formatCurrency(outgoing),
      },
      {
        helper: 'Diferença entre entradas e saídas recentes.',
        label: 'Volume líquido',
        tone: net >= 0 ? 'positive' : 'negative',
        value: `${net < 0 ? '- ' : ''}${formatCurrency(Math.abs(net))}`,
      },
    ];
  });
  protected readonly hasTransfers = computed(() => this.transfers().length > 0);
  protected readonly heroFactSkeletonItems = [0, 1];
  protected readonly ledgerSkeletonItems = [0, 1, 2, 3, 4, 5];
  protected readonly metricSkeletonItems = [0, 1, 2, 3];
  protected readonly recentTransfers = computed(() => this.transfers().slice(0, 6));
  protected readonly shouldShowSkeleton = computed(
    () => this.isLoading() && this.transfers().length == 0,
  );
  protected readonly userName = computed(() => this.user()?.name || 'Cliente');

  public constructor() {
    this.loadDashboard();

    this.notificationService
      .connect()
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.loadDashboard(false));
  }

  protected isOutgoingTransfer(transfer: Transfer): boolean {
    return transfer.payer.id == this.authService.account()?.id;
  }

  protected resolveTransferCounterparty(transfer: Transfer): string {
    if (this.isOutgoingTransfer(transfer)) {
      return `Pago para ${transfer.payee.name || 'Conta protegida'}`;
    }

    return `Recebido de ${transfer.payer.name || 'Conta protegida'}`;
  }

  protected resolveTransferDate(transfer: Transfer): string {
    return formatDateTime(this.resolveTransferTimestampValue(transfer));
  }

  protected resolveTransferValue(transfer: Transfer): string {
    const sign = this.isOutgoingTransfer(transfer) ? '- ' : '+ ';
    return sign + formatCurrency(transfer.amount);
  }

  private resolveTransferTimestampValue(transfer: Transfer): string {
    return transfer.createdAt;
  }

  private loadDashboard(showLoading = true): void {
    if (showLoading) this.isLoading.set(true);

    this.errorMessage.set(null);

    this.transferService.findMany(0, 12).subscribe({
      next: ({ content }) => {
        this.transfers.set(content);
        this.isLoading.set(false);
      },
      error: ({ error, status }) => {
        if (status == 403) {
          this.authService.clear();
          return;
        }

        this.errorMessage.set(httpErrorMessage(error, 'Não foi possível carregar o painel'));
        this.isLoading.set(false);
      },
    });
  }
}
