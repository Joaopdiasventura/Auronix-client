import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { QrService, TransferQrEntry } from '../../../core/services/qr/qr.service';
import { PageHeader } from '../../../shared/components/ui/page-header/page-header';
import { QrDisplay } from '../../../shared/components/ui/qr-display/qr-display';
import { resolveTransferKey } from '../../../shared/utils/resolve-transfer-key';

type QrDisplayMode = 'email' | 'paymentRequest' | null;

@Component({
  selector: 'app-qr-display-page',
  imports: [PageHeader, QrDisplay, RouterLink],
  templateUrl: './display-page.html',
  styleUrl: './display-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrDisplayPage {
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly mode = signal<QrDisplayMode>(null);
  protected readonly qrValue = signal('');

  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly qrService = inject(QrService);

  protected readonly backLabel = computed(() =>
    this.mode() == 'email' ? 'Voltar ao perfil' : 'Voltar à cobrança',
  );
  protected readonly backLink = computed(() =>
    this.mode() == 'email' ? '/profile' : `/payment-request/${this.qrValue()}`,
  );
  protected readonly downloadFileName = computed(() => {
    const qrEntry = this.qrEntry();
    return qrEntry ? this.qrService.buildDownloadFileName(qrEntry) : 'auronix-qr';
  });
  protected readonly helperCopy = computed(() =>
    this.mode() == 'paymentRequest'
      ? 'Apresente este QR para abrir a cobrança.'
      : 'Apresente este QR para receber por e-mail.',
  );
  protected readonly pageTitle = computed(() =>
    this.mode() == 'paymentRequest' ? 'QR code da cobrança' : 'QR code da conta',
  );
  protected readonly qrPayload = computed(() => {
    const qrEntry = this.qrEntry();
    return qrEntry ? this.qrService.buildTransferEntryUrl(qrEntry) : '';
  });
  protected readonly qrDescription = computed(() =>
    this.mode() == 'paymentRequest'
      ? 'Este QR code abre diretamente a cobrança atual no fluxo de transferência.'
      : 'Este QR code abre o fluxo de transferência com o e-mail atual da conta.',
  );
  protected readonly qrKicker = computed(() =>
    this.mode() == 'paymentRequest' ? 'QR da cobrança' : 'QR da conta',
  );
  protected readonly qrTitle = computed(() =>
    this.mode() == 'paymentRequest' ? 'QR code da cobrança' : 'QR code do e-mail',
  );
  protected readonly valueLabel = computed(() =>
    this.mode() == 'paymentRequest' ? 'Identificador da cobrança' : 'E-mail da conta',
  );
  private readonly qrEntry = computed<TransferQrEntry | null>(() => {
    if (this.mode() == 'paymentRequest') {
      return {
        kind: 'paymentRequest',
        value: this.qrValue(),
      };
    }

    if (this.mode() == 'email') {
      return {
        kind: 'email',
        value: this.qrValue(),
      };
    }

    return null;
  });

  public constructor() {
    this.activatedRoute.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe((queryParamMap) => this.resolveRouteState(queryParamMap));
  }

  private resolveRouteState(queryParamMap: ParamMap): void {
    const email = queryParamMap.get('email')?.trim() || '';
    const paymentRequest = queryParamMap.get('paymentRequest')?.trim() || '';

    this.errorMessage.set(null);
    this.mode.set(null);
    this.qrValue.set('');

    if (email && paymentRequest) {
      this.errorMessage.set('Informe apenas um conteúdo por QR code');
      return;
    }

    if (!email && !paymentRequest) {
      this.errorMessage.set('Nenhum conteúdo foi informado para gerar o QR code');
      return;
    }

    if (email) {
      const resolution = resolveTransferKey(email);
      if (resolution.kind != 'email') {
        this.errorMessage.set('Digite um e-mail válido para gerar o QR code');
        return;
      }

      this.mode.set('email');
      this.qrValue.set(resolution.value);
      return;
    }

    const resolution = resolveTransferKey(paymentRequest);
    if (resolution.kind != 'paymentRequest') {
      this.errorMessage.set('Digite um identificador de cobrança válido para gerar o QR code');
      return;
    }

    this.mode.set('paymentRequest');
    this.qrValue.set(resolution.value);
  }
}
