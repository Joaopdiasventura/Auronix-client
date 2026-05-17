import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { configureAxe } from 'vitest-axe';
import { vi } from 'vitest';
import { AuthService } from '../../core/services/auth/auth.service';
import { UserService } from '../../core/services/user/user.service';
import { ProfilePage } from './profile-page';

const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
  },
});

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  let router: Router;

  const authService = {
    clear: vi.fn(),
    account: signal({
      id: 'account-id',
      balance: 125000,
      user: {
        id: 'user-id',
        email: 'joao@auronix.com',
        name: 'Joao',
        createdAt: '2026-03-29T00:00:00.000Z',
      },
    }),
    balance: vi.fn(() => authService.account()?.balance ?? 0),
    data: signal({
      id: 'user-id',
      email: 'joao@auronix.com',
      name: 'Joao',
      createdAt: '2026-03-29T00:00:00.000Z',
    }),
    update: vi.fn(),
    updateAccount: vi.fn((account) => authService.account.set(account)),
  };

  const userService = {
    logout: vi.fn().mockReturnValue(of(void 0)),
    update: vi.fn().mockReturnValue(of(void 0)),
  };

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();

    authService.data.set({
      id: 'user-id',
      email: 'joao@auronix.com',
      name: 'Joao',
      createdAt: '2026-03-29T00:00:00.000Z',
    });
    authService.account.set({
      id: 'account-id',
      balance: 125000,
      user: {
        id: 'user-id',
        email: 'joao@auronix.com',
        name: 'Joao',
        createdAt: '2026-03-29T00:00:00.000Z',
      },
    });
    userService.logout.mockReturnValue(of(void 0));
    userService.update.mockReturnValue(of(void 0));
  });

  it('renders the account data', async () => {
    await createComponent();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain('Dados da conta');
    expect(nativeElement.textContent).toContain('joao@auronix.com');
  });

  it('saves the profile and updates the authenticated user', async () => {
    await createComponent();

    fillInput('name', '  Joao Silva  ');
    fillInput('email', 'joao.silva@auronix.com');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(userService.update).toHaveBeenCalledWith({
      email: 'joao.silva@auronix.com',
      name: 'Joao Silva',
    });
    expect(authService.update).toHaveBeenCalledWith({
      id: 'user-id',
      email: 'joao.silva@auronix.com',
      name: 'Joao Silva',
      createdAt: '2026-03-29T00:00:00.000Z',
    });
    expect(authService.updateAccount).toHaveBeenCalledWith({
      id: 'account-id',
      balance: 125000,
      user: {
        id: 'user-id',
        email: 'joao.silva@auronix.com',
        name: 'Joao Silva',
        createdAt: '2026-03-29T00:00:00.000Z',
      },
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Perfil atualizado com sucesso',
    );
  });

  it('shows the loading state while the profile update is pending', async () => {
    const updateResponse$ = new Subject<void>();
    userService.update.mockReturnValue(updateResponse$.asObservable());

    await createComponent();

    fillInput('name', 'Joao Silva');
    fillInput('email', 'joao.silva@auronix.com');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Salvando perfil...');

    updateResponse$.next();
    updateResponse$.complete();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(button.disabled).toBe(false);
  });

  it('shows the backend error message when saving fails', async () => {
    userService.update.mockReturnValue(
      throwError(() => ({
        error: {
          message: 'Não foi possível atualizar o perfil',
        },
      })),
    );

    await createComponent();

    fillInput('name', 'Joao Silva');
    fillInput('email', 'joao.silva@auronix.com');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Não foi possível atualizar o perfil',
    );
  });

  it('logs out the current user and redirects to the login page', async () => {
    await createComponent();

    fixture.componentInstance.logout();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(userService.logout).toHaveBeenCalledTimes(1);
    expect(authService.clear).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/user/login']);
  });

  it('does not submit another save while the profile is already saving', async () => {
    await createComponent();

    fixture.componentInstance['isSaving'].set(true);
    fixture.componentInstance.save(new Event('submit'));

    expect(userService.update).not.toHaveBeenCalled();
  });

  it('has no critical accessibility violations in the profile QR section', async () => {
    await createComponent();

    const results = await axe(fixture.nativeElement as HTMLElement);
    expect(results.violations).toHaveLength(0);
  });

  function fillInput(id: string, value: string): void {
    const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }
});
