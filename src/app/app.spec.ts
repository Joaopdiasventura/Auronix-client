import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY, of, Subject } from 'rxjs';
import { configureAxe } from 'vitest-axe';
import { vi } from 'vitest';
import { NotificationEventType } from './core/enums/notification/notification-event-type.enum';
import { NotificationStreamEvent } from './core/models/notification';
import { User } from './core/models/user';
import { AccountService } from './core/services/account/account.service';
import { AuthService } from './core/services/auth/auth.service';
import { NotificationService } from './core/services/notification/notification.service';
import { ToastService } from './core/services/toast/toast.service';
import { UserService } from './core/services/user/user.service';
import { formatCurrency } from './shared/utils/format-currency';
import { App } from './app';

const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
  },
});

describe('App', () => {
  let notifications$: Subject<NotificationStreamEvent>;
  let originalNotification: typeof Notification | undefined;

  const authService = {
    account: signal(createAccount()),
    balance: vi.fn(() => authService.account()?.balance ?? 0),
    data: signal<User | null>(null),
    isLoggedIn: vi.fn(() => authService.data() != null),
    updateAccount: vi.fn((account) => authService.account.set(account)),
  };

  const accountService = {
    findCurrent: vi.fn(),
  };

  const notificationService = {
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };

  const toastService = {
    toasts: signal<
      {
        id: string;
        message: string;
        route: string[];
        title: string;
        variant: 'info' | 'success' | 'error';
      }[]
    >([]),
    dismiss: vi.fn((id: string) =>
      toastService.toasts.update((currentToasts) =>
        currentToasts.filter((currentToast) => currentToast.id != id),
      ),
    ),
    show: vi.fn((toast) => toastService.toasts.update((currentToasts) => [...currentToasts, toast])),
  };

  const userService = {
    logout: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AccountService, useValue: accountService },
        { provide: AuthService, useValue: authService },
        { provide: NotificationService, useValue: notificationService },
        { provide: ToastService, useValue: toastService },
        { provide: UserService, useValue: userService },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    originalNotification = globalThis.Notification;
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });

    authService.data.set(null);
    authService.account.set(createAccount());
    accountService.findCurrent.mockReturnValue(of({ ...createAccount(), balance: 95000 }));
    toastService.toasts.set([]);
    vi.clearAllMocks();
    notifications$ = new Subject<NotificationStreamEvent>();
    notificationService.connect.mockReturnValue(notifications$.asObservable());
  });

  afterEach(() => {
    if (originalNotification) {
      globalThis.Notification = originalNotification;
      return;
    }

    delete (globalThis as { Notification?: typeof Notification }).Notification;
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the root outlet container', async () => {
    authService.data.set(createUser());
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-root')).not.toBeNull();
  });

  it('starts and stops the notification stream from the auth state', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(notificationService.stop).toHaveBeenCalledTimes(1);
    expect(notificationService.start).not.toHaveBeenCalled();

    authService.data.set(createUser());
    fixture.detectChanges();
    await fixture.whenStable();

    expect(notificationService.start).toHaveBeenCalledTimes(1);

    authService.data.set(null);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(notificationService.stop).toHaveBeenCalledTimes(2);
  });

  it('refreshes the account and shows a toast while the app is visible', async () => {
    authService.data.set(createUser());

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    notifications$.next(createCompletedEvent());
    await fixture.whenStable();

    expect(accountService.findCurrent).toHaveBeenCalled();
    expect(authService.updateAccount).toHaveBeenCalledWith({ ...createAccount(), balance: 95000 });
    expect(toastService.show).toHaveBeenCalledWith({
      id: '42',
      title: 'Transferência concluída',
      message: `Operação liquidada · ${formatCurrency(5000)}`,
      route: ['/transfer', 'transfer-id'],
      variant: 'success',
    });
  });

  it('uses the browser notification when the app is not visible', async () => {
    authService.data.set(createUser());
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    globalThis.Notification = MockBrowserNotification as never;
    MockBrowserNotification.instances.length = 0;
    MockBrowserNotification.permission = 'granted';

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    notifications$.next(createCompletedEvent());
    await fixture.whenStable();

    expect(toastService.show).not.toHaveBeenCalled();
    expect(MockBrowserNotification.instances).toHaveLength(1);
    expect(MockBrowserNotification.instances[0].title).toBe('Transferência concluída');
  });

  it('has no critical accessibility violations in the authenticated shell', async () => {
    authService.data.set(createUser());
    authService.account.set({ ...createAccount(), balance: 125000 });
    notificationService.connect.mockReturnValue(EMPTY);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const results = await axe(fixture.nativeElement as HTMLElement);
    expect(results.violations).toHaveLength(0);
  });
});

function createCompletedEvent(): NotificationStreamEvent {
  return {
    id: '42',
    type: NotificationEventType.TransferCompleted,
    data: {
      transactionId: 'transfer-id',
      amount: 5000,
      payerAccountId: 'account-id',
      payeeAccountId: 'payee-id',
      createdAt: '2026-03-29T00:00:00.000Z',
      type: 'transaction.completed',
    },
  };
}

function createUser(): User {
  return {
    id: 'user-id',
    email: 'joao@auronix.com',
    name: 'Joao',
    createdAt: '2026-03-29T00:00:00.000Z',
  };
}

function createAccount(): {
  id: string;
  balance: number;
  user: User;
} {
  return {
    id: 'account-id',
    balance: 1000,
    user: createUser(),
  };
}

class MockBrowserNotification {
  public static readonly instances: MockBrowserNotification[] = [];
  public static permission: NotificationPermission = 'granted';
  public static requestPermission = vi.fn().mockResolvedValue('granted');

  public onclick: (() => void) | null = null;

  public constructor(
    public readonly title: string,
    public readonly options?: NotificationOptions,
  ) {
    MockBrowserNotification.instances.push(this);
  }

  public close(): void {
    return;
  }
}
