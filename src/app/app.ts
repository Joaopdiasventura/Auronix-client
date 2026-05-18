import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NotificationEventType } from './core/enums/notification/notification-event-type.enum';
import { NotificationStreamEvent } from './core/models/notification';
import { ToastNotification } from './core/models/toast';
import { AccountService } from './core/services/account/account.service';
import { AuthService } from './core/services/auth/auth.service';
import { NotificationService } from './core/services/notification/notification.service';
import { ToastService } from './core/services/toast/toast.service';
import { NotificationToast } from './shared/components/notification-toast/notification-toast';
import { AppIcon } from './shared/components/ui/app-icon/app-icon';
import { formatCurrency } from './shared/utils/format-currency';

interface WorkspaceNavigationItem {
  ariaLabel: string;
  exact: boolean;
  icon: 'dashboard' | 'payment-request' | 'profile' | 'transfer';
  label: string;
  mobileLabel: string;
  route: string;
}

const WORKSPACE_NAVIGATION: WorkspaceNavigationItem[] = [
  {
    ariaLabel: 'Abrir painel da conta',
    exact: true,
    icon: 'dashboard',
    label: 'Painel',
    mobileLabel: 'Painel',
    route: '/',
  },
  {
    ariaLabel: 'Abrir cobranças',
    exact: false,
    icon: 'payment-request',
    label: 'Cobranças',
    mobileLabel: 'Cobranças',
    route: '/payment-request/create',
  },
  {
    ariaLabel: 'Abrir transferências',
    exact: false,
    icon: 'transfer',
    label: 'Transferências',
    mobileLabel: 'Transfer.',
    route: '/transfer',
  },
  {
    ariaLabel: 'Abrir perfil da conta',
    exact: false,
    icon: 'profile',
    label: 'Perfil',
    mobileLabel: 'Perfil',
    route: '/profile',
  },
];

@Component({
  selector: 'app-root',
  imports: [
    AppIcon,
    NgOptimizedImage,
    NotificationToast,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly accountService = inject(AccountService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  protected readonly currentUrl = signal(this.router.url);
  protected readonly navigation = WORKSPACE_NAVIGATION;
  protected readonly user = this.authService.data;

  protected readonly balanceLabel = computed(() => formatCurrency(this.authService.balance()));
  protected readonly isAuthRoute = computed(() => this.currentUrl().startsWith('/user/'));
  protected readonly userDescriptor = computed(() => {
    const user = this.user();
    if (!user) return 'Sessão protegida';

    return `Conta ${(this.authService.account()?.id || user.id).slice(0, 8).toUpperCase()}`;
  });
  protected readonly userInitials = computed(() => {
    const name = this.user()?.name;
    if (!name) return 'AX';

    return name
      .split(' ')
      .filter((chunk) => chunk.trim().length > 0)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() ?? '')
      .join('');
  });

  public constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });

    this.notificationService
      .connect()
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        this.refreshAccount();
        this.presentNotification(event);
      });

    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.notificationService.start();
        return;
      }

      this.notificationService.stop();
    });
  }

  private presentNotification(event: NotificationStreamEvent): void {
    const toast = this.createToast(event);

    if (this.isDocumentVisible()) {
      this.toastService.show(toast);
      return;
    }

    void this.showBrowserNotification(toast);
  }

  private createToast(event: NotificationStreamEvent): ToastNotification {
    const amount = formatCurrency(event.data.amount);

    if (event.type == NotificationEventType.TransferCompleted) {
      return {
        id: event.id,
        title: 'Transferência concluída',
        message: `Operação liquidada · ${amount}`,
        route: ['/transfer', event.data.transactionId],
        variant: 'success',
      };
    }

    return {
      id: event.id,
      title: 'Movimentação da conta',
      message: `Operação registrada · ${amount}`,
      route: ['/transfer', event.data.transactionId],
      variant: 'info',
    };
  }

  private isDocumentVisible(): boolean {
    if (typeof document == 'undefined') return true;
    return document.visibilityState == 'visible';
  }

  private async showBrowserNotification(toast: ToastNotification): Promise<void> {
    if (typeof Notification == 'undefined') {
      this.toastService.show(toast);
      return;
    }

    if (Notification.permission == 'granted') {
      this.openBrowserNotification(toast);
      return;
    }

    if (Notification.permission == 'denied') {
      this.toastService.show(toast);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission == 'granted') {
        this.openBrowserNotification(toast);
        return;
      }
    } catch {
      this.toastService.show(toast);
      return;
    }

    this.toastService.show(toast);
  }

  private openBrowserNotification(toast: ToastNotification): void {
    const notification = new Notification(toast.title, {
      body: toast.message,
      tag: toast.id,
    });

    notification.onclick = (): void => {
      if (typeof window != 'undefined') window.focus();
      this.router.navigate(toast.route);
      notification.close();
    };
  }

  private refreshAccount(): void {
    this.accountService.findCurrent().subscribe({
      next: (account) => this.authService.updateAccount(account),
    });
  }
}
