import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, required, validate } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { PaymentRequest } from '../../../core/models/payment-request';
import { PaymentRequestService } from '../../../core/services/payment-request/payment-request.service';
import { CustomInput } from '../../../shared/components/ui/custom-input/custom-input';
import { PageHeader } from '../../../shared/components/ui/page-header/page-header';
import { formatCurrency } from '../../../shared/utils/format-currency';
import { httpErrorMessage } from '../../../shared/utils/http-error-message';
import { parseMoneyInput } from '../../../shared/utils/parse-money-input';

interface CreatePaymentRequestFormValue {
  value: string;
}

@Component({
  selector: 'app-payment-request-create-page',
  imports: [CustomInput, PageHeader, RouterLink],
  templateUrl: './create-page.html',
  styleUrl: './create-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentRequestCreatePage {
  protected readonly createdPaymentRequest = signal<PaymentRequest | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly shareMessage = signal<string | null>(null);

  protected readonly canNativeShare =
    typeof navigator != 'undefined' && typeof navigator.share == 'function';

  private readonly paymentRequestService = inject(PaymentRequestService);

  private readonly createPaymentRequestModel = signal<CreatePaymentRequestFormValue>({
    value: '',
  });

  protected readonly createPaymentRequestForm = form(this.createPaymentRequestModel, (schema) => {
    required(schema.value, { message: 'Digite um valor' });
    validate(schema.value, ({ value }) => {
      const amount = parseMoneyInput(value());
      if (amount == null) return { kind: 'money-format', message: 'Digite um valor válido' };
      if (amount < 10)
        return { kind: 'money-min', message: 'Digite um valor de pelo menos R$ 0,10' };
      if (amount > 1000000_00)
        return { kind: 'money-max', message: 'Digite um valor menor que R$ 1.000.000,00' };
      return undefined;
    });
  });

  protected readonly formattedValue = computed(() => {
    const paymentRequest = this.createdPaymentRequest();
    return paymentRequest ? formatCurrency(paymentRequest.value) : '';
  });
  protected readonly shareUrl = computed(() => {
    const paymentRequest = this.createdPaymentRequest();
    if (!paymentRequest || typeof window == 'undefined') return '';
    return `${window.location.origin}/payment-request/${paymentRequest.id}`;
  });

  public submit(event: Event): void {
    event.preventDefault();

    if (this.createPaymentRequestForm().invalid() || this.isLoading()) return;

    const value = parseMoneyInput(this.createPaymentRequestModel().value);
    if (value == null) {
      this.errorMessage.set('Digite um valor válido');
      return;
    }

    this.errorMessage.set(null);
    this.shareMessage.set(null);
    this.isLoading.set(true);

    this.paymentRequestService.create({ value }).subscribe({
      next: (paymentRequest) => {
        this.createdPaymentRequest.set(paymentRequest);
        this.isLoading.set(false);
      },
      error: ({ error }) => {
        this.errorMessage.set(httpErrorMessage(error, 'Não foi possível criar a cobrança'));
        this.isLoading.set(false);
      },
    });
  }

  public reset(): void {
    this.createdPaymentRequest.set(null);
    this.errorMessage.set(null);
    this.shareMessage.set(null);
    this.createPaymentRequestForm().reset({ value: '' });
  }

  public async copyShareLink(): Promise<void> {
    if (typeof navigator == 'undefined' || !navigator.clipboard) {
      this.shareMessage.set('Não foi possível copiar o link automaticamente');
      return;
    }

    try {
      await navigator.clipboard.writeText(this.shareUrl());
      this.shareMessage.set('Link copiado para a área de transferência');
    } catch {
      this.shareMessage.set('Não foi possível copiar o link automaticamente');
    }
  }

  public async shareRequest(): Promise<void> {
    if (typeof navigator == 'undefined' || !navigator.share) {
      await this.copyShareLink();
      return;
    }

    try {
      await navigator.share({
        title: 'Cobrança Auronix',
        text: 'Use este link para validar a cobrança.',
        url: this.shareUrl(),
      });
      this.shareMessage.set('Link compartilhado com sucesso');
    } catch (error) {
      if (error instanceof DOMException && error.name == 'AbortError') return;
      this.shareMessage.set('Não foi possível compartilhar o link');
    }
  }
}
