import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { configureAxe } from 'vitest-axe';
import { vi } from 'vitest';
import { AccountService } from '../../../core/services/account/account.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { UserService } from '../../../core/services/user/user.service';
import { LoginPage } from './login-page';

const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
  },
});

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let router: Router;

  const authService = {
    update: vi.fn(),
    updateAccount: vi.fn(),
  };

  const accountService = {
    findCurrent: vi.fn().mockReturnValue(of({ id: 'account-id' })),
  };

  const userService = {
    login: vi.fn().mockReturnValue(of({ id: 'user-id' })),
  };

  async function createComponent(redirectTo: string | null = null): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(redirectTo ? { redirectTo } : {}),
            },
          },
        },
        { provide: AccountService, useValue: accountService },
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    userService.login.mockReturnValue(of({ id: 'user-id' }));
    accountService.findCurrent.mockReturnValue(of({ id: 'account-id' }));
  });

  it('renders the secure login heading', async () => {
    await createComponent();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).toContain('Acesse sua conta');
  });

  it('submits valid credentials and redirects to the requested route', async () => {
    await createComponent('/transfer/key?email=maria%40auronix.com');

    fillInput('email', 'user@auronix.com');
    fillInput('password', 'Password1!');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(userService.login).toHaveBeenCalledWith({
      email: 'user@auronix.com',
      password: 'Password1!',
    });
    expect(authService.update).toHaveBeenCalledWith({ id: 'user-id' });
    expect(authService.updateAccount).toHaveBeenCalledWith({ id: 'account-id' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/transfer/key?email=maria%40auronix.com');
  });

  it('shows the backend error message and restores the submit state', async () => {
    userService.login.mockReturnValue(
      throwError(() => ({
        error: {
          message: 'Credenciais inválidas',
        },
      })),
    );

    await createComponent();

    fillInput('email', 'user@auronix.com');
    fillInput('password', 'Password1!');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const button = nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;

    expect(nativeElement.textContent).toContain('Credenciais inválidas');
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain('Entrar');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not submit when the form is invalid', async () => {
    await createComponent();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(userService.login).not.toHaveBeenCalled();
    expect(authService.update).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('has no critical accessibility violations in the sign-in flow', async () => {
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
