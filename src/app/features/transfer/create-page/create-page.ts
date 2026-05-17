import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, validate } from '@angular/forms/signals';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { PaymentRequest } from '../../../core/models/payment-request';
import { AccountService } from '../../../core/services/account/account.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { PaymentRequestService } from '../../../core/services/payment-request/payment-request.service';
import { TransferService } from '../../../core/services/transfer/transfer.service';
import { CustomInput } from '../../../shared/components/ui/custom-input/custom-input';
import { PageHeader } from '../../../shared/components/ui/page-header/page-header';
import { Skeleton } from '../../../shared/components/ui/skeleton/skeleton';
import { SkeletonReadonlyGrid } from '../../../shared/components/ui/skeleton/skeleton-readonly-grid';
import { PageFeedbackState } from '../../../shared/view-models/ui';
import { formatCurrency } from '../../../shared/utils/format-currency';
import { httpErrorMessage } from '../../../shared/utils/http-error-message';
import { parseMoneyInput } from '../../../shared/utils/parse-money-input';
import { resolveTransferKey } from '../../../shared/utils/resolve-transfer-key';

interface CreateTransferFormValue {
  value: string;
}

type TransferCreateMode = 'email' | 'paymentRequest' | null;

@Component({
  selector: 'app-transfer-create-page',
  imports: [CustomInput, PageHeader, RouterLink, Skeleton, SkeletonReadonlyGrid],
  templateUrl: './create-page.html',
  styleUrl: './create-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferCreatePage {
  protected readonly formErrorMessage = signal<string | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly mode = signal<TransferCreateMode>(null);
  protected readonly pageErrorMessage = signal<string | null>(null);
  protected readonly payeeAccountId = signal('');
  protected readonly payeeEmail = signal('');
  protected readonly paymentRequest = signal<PaymentRequest | null>(null);
  protected readonly paymentRequestId = signal('');

  private readonly accountService = inject(AccountService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly paymentRequestService = inject(PaymentRequestService);
  private readonly router = inject(Router);
  private readonly transferService = inject(TransferService);
  private routeStateRequestId = 0;

  private readonly createTransferModel = signal<CreateTransferFormValue>({
    value: '',
  });

  protected readonly createTransferForm = form(this.createTransferModel, (schema) => {
    validate(schema.value, ({ value }) => {
      if (!this.isEmailMode()) return undefined;

      const amount = parseMoneyInput(value());
      if (amount == null) return { kind: 'money-format', message: 'Digite um valor válido' };
      if (amount < 1) return { kind: 'money-min', message: 'Digite um valor maior que zero' };
      if (amount > 1000000_00)
        return { kind: 'money-max', message: 'Digite um valor menor que R$ 1.000.000,00' };

      return undefined;
    });
  });

  protected readonly feedbackState = computed<PageFeedbackState | null>(() => {
    const pageErrorMessage = this.pageErrorMessage();
    if (!this.isLoading() && pageErrorMessage) {
      return {
        description: pageErrorMessage,
        title: 'Não foi possível preparar esta transferência',
        tone: 'danger',
      };
    }

    if (!this.isLoading() && this.hasResolvedTarget() && this.isOwnTarget()) {
      return {
        description: this.isPaymentRequestMode()
          ? 'Esta cobrança pertence à sua conta. Compartilhe o link com quem vai realizar a transferência.'
          : 'O e-mail informado pertence à sua conta. Use outra chave para continuar.',
        title: this.isPaymentRequestMode()
          ? 'Cobrança indisponível para a própria conta'
          : 'Transferência indisponível para a própria conta',
        tone: 'info',
      };
    }

    return null;
  });
  protected readonly formattedValue = computed(() => {
    if (this.isEmailMode()) {
      const parsedValue = parseMoneyInput(this.createTransferModel().value);
      return parsedValue == null ? '' : formatCurrency(parsedValue);
    }

    const paymentRequest = this.paymentRequest();
    return paymentRequest ? formatCurrency(paymentRequest.value) : '';
  });
  protected readonly hasResolvedTarget = computed(() => {
    if (this.isEmailMode()) return this.payeeAccountId().length > 0;
    if (this.isPaymentRequestMode()) return this.paymentRequest() !== null;
    return false;
  });
  protected readonly emailSnapshotSkeletonLabelWidths = ['8rem', '8rem', '8rem'];
  protected readonly emailSnapshotSkeletonValueWidths = ['12rem', '11rem', '10rem'];
  protected readonly isEmailMode = computed(() => this.mode() == 'email');
  protected readonly isPaymentRequestMode = computed(() => this.mode() == 'paymentRequest');
  protected readonly isOwnTarget = computed(() => {
    const currentUserId = this.authService.data()?.id;
    if (!currentUserId) return false;

    if (this.isEmailMode()) return this.payeeAccountId() == this.authService.account()?.id;

    return this.paymentRequest()?.account.id == this.authService.account()?.id;
  });
  protected readonly pageDescription = computed(() =>
    this.isPaymentRequestMode()
      ? 'Revise a cobrança vinculada e autorize a transferência.'
      : 'Confirme o favorecido e informe o valor da transferência.',
  );
  protected readonly pageTitle = computed(() =>
    this.isPaymentRequestMode() ? 'Autorização de transferência' : 'Nova transferência',
  );
  protected readonly payeeName = computed(
    () => this.paymentRequest()?.account.name || this.payeeEmail() || 'Conta protegida',
  );
  protected readonly paymentRequestSnapshotSkeletonLabelWidths = ['10rem', '8rem', '8rem', '8rem'];
  protected readonly paymentRequestSnapshotSkeletonValueWidths = [
    '12rem',
    '11rem',
    '11rem',
    '10rem',
  ];
  protected readonly recipientIdentifier = computed(() =>
    this.isPaymentRequestMode() ? this.paymentRequestId() : this.payeeEmail(),
  );
  protected readonly recipientIdentifierLabel = computed(() =>
    this.isPaymentRequestMode() ? 'Cobrança associada' : 'E-mail da conta',
  );
  protected readonly shouldShowSkeleton = computed(
    () => this.isLoading() && !this.hasResolvedTarget(),
  );
  protected readonly summaryCopy = computed(() =>
    this.isPaymentRequestMode()
      ? 'Valor, favorecido e identificador seguem bloqueados nesta etapa para evitar alterações manuais.'
      : 'A conta favorecida fica travada nesta etapa. O valor ainda pode ser ajustado antes do envio.',
  );
  protected readonly summaryIntegrityLabel = computed(() =>
    this.isPaymentRequestMode() ? 'Valor e conta travados' : 'Conta travada, valor editável',
  );
  protected readonly summaryKicker = computed(() =>
    this.isPaymentRequestMode() ? 'Cobrança validada' : 'Favorecido identificado',
  );
  protected readonly summaryLabel = computed(() =>
    this.isPaymentRequestMode() ? this.formattedValue() : this.payeeName(),
  );
  protected readonly transferStepDescription = computed(() =>
    this.isPaymentRequestMode()
      ? 'Autorize a liquidação com o valor e favorecido vinculados à cobrança.'
      : 'Defina o valor e confirme a conta favorecida antes do envio.',
  );
  protected readonly transferStepTitle = computed(() =>
    this.isPaymentRequestMode() ? 'Revisar e concluir' : 'Informar valor e concluir',
  );
  protected readonly submitLabel = computed(() =>
    this.isSubmitting()
      ? this.isPaymentRequestMode()
        ? 'Confirmando transferência...'
        : 'Criando transferência...'
      : this.isPaymentRequestMode()
        ? 'Confirmar transferência'
        : 'Criar transferência',
  );

  public constructor() {
    this.activatedRoute.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe((queryParamMap) => this.resolveRouteState(queryParamMap));
  }

  public submit(event: Event): void {
    event.preventDefault();

    if (this.createTransferForm().invalid() || this.isSubmitting()) return;

    const payeeId = this.resolvePayeeId();
    if (!payeeId) {
      this.formErrorMessage.set('Não foi possível identificar o favorecido desta transferência');
      return;
    }

    if (this.isOwnTarget()) {
      this.formErrorMessage.set(
        this.isPaymentRequestMode()
          ? 'Você não pode pagar uma cobrança criada pela própria conta'
          : 'Você não pode transferir para a própria conta',
      );
      return;
    }

    const value = this.resolveTransferValue();
    if (value == null) {
      this.formErrorMessage.set('Digite um valor válido');
      return;
    }

    this.formErrorMessage.set(null);
    this.isSubmitting.set(true);

    this.transferService
      .create({
        payeeAccountId: payeeId,
        amount: value,
      })
      .subscribe({
        next: () => {
          this.router.navigate(['/transfer']);
        },
        error: ({ error }) => {
          this.formErrorMessage.set(
            httpErrorMessage(error, 'Não foi possível criar a transferência'),
          );
          this.isSubmitting.set(false);
        },
      });
  }

  private resolveRouteState(queryParamMap: ParamMap): void {
    const routeStateRequestId = ++this.routeStateRequestId;
    const email = queryParamMap.get('email')?.trim() || '';
    const paymentRequestId = queryParamMap.get('paymentRequest')?.trim() || '';

    this.resetState();

    if (email && paymentRequestId) {
      this.mode.set(null);
      this.pageErrorMessage.set('Informe apenas uma chave de transferência por vez');
      this.isLoading.set(false);
      return;
    }

    if (!email && !paymentRequestId) {
      this.mode.set(null);
      this.pageErrorMessage.set('Informe uma chave de transferência para iniciar');
      this.isLoading.set(false);
      return;
    }

    if (email) {
      const resolution = resolveTransferKey(email);
      if (resolution.kind != 'email') {
        this.pageErrorMessage.set('Digite um e-mail válido');
        this.isLoading.set(false);
        return;
      }

      this.mode.set('email');
      this.payeeEmail.set(resolution.value);
      this.loadPayee(resolution.value, routeStateRequestId);
      return;
    }

    const resolution = resolveTransferKey(paymentRequestId);
    if (resolution.kind != 'paymentRequest') {
      this.pageErrorMessage.set('Digite um identificador de cobrança válido');
      this.isLoading.set(false);
      return;
    }

    this.mode.set('paymentRequest');
    this.paymentRequestId.set(resolution.value);
    this.loadPaymentRequest(resolution.value, routeStateRequestId);
  }

  private resetState(): void {
    this.createTransferForm().reset({
      value: '',
    });
    this.formErrorMessage.set(null);
    this.isLoading.set(true);
    this.isSubmitting.set(false);
    this.mode.set(null);
    this.pageErrorMessage.set(null);
    this.payeeAccountId.set('');
    this.payeeEmail.set('');
    this.paymentRequest.set(null);
    this.paymentRequestId.set('');
  }

  private loadPayee(email: string, routeStateRequestId: number): void {
    this.accountService.findIdByUserEmail(email).subscribe({
      next: (payeeAccountId) => {
        if (routeStateRequestId != this.routeStateRequestId) return;

        this.payeeAccountId.set(payeeAccountId);
        this.isLoading.set(false);
      },
      error: ({ error, status }) => {
        if (routeStateRequestId != this.routeStateRequestId) return;

        if (status == 403) {
          this.authService.clear();
          return;
        }

        this.pageErrorMessage.set(
          status == 404
            ? 'Usuário não encontrado'
            : httpErrorMessage(error, 'Não foi possível localizar esta conta'),
        );
        this.isLoading.set(false);
      },
    });
  }

  private loadPaymentRequest(paymentRequestId: string, routeStateRequestId: number): void {
    this.paymentRequestService.findById(paymentRequestId).subscribe({
      next: (paymentRequest) => {
        if (routeStateRequestId != this.routeStateRequestId) return;

        if (!paymentRequest.account?.id) {
          this.pageErrorMessage.set('Não foi possível identificar o favorecido desta cobrança');
          this.isLoading.set(false);
          return;
        }

        this.paymentRequest.set(paymentRequest);
        this.isLoading.set(false);
      },
      error: ({ error, status }) => {
        if (routeStateRequestId != this.routeStateRequestId) return;

        if (status == 403) {
          this.authService.clear();
          return;
        }

        this.pageErrorMessage.set(
          status == 404
            ? 'Cobrança inexistente ou expirada'
            : httpErrorMessage(error, 'Não foi possível carregar esta cobrança'),
        );
        this.isLoading.set(false);
      },
    });
  }

  private resolvePayeeId(): string | null {
    if (this.isPaymentRequestMode()) return this.paymentRequest()?.account.id || null;
    return this.payeeAccountId() || null;
  }

  private resolveTransferValue(): number | null {
    if (this.isPaymentRequestMode()) return this.paymentRequest()?.value ?? null;
    return parseMoneyInput(this.createTransferModel().value);
  }
}
