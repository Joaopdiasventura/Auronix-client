import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AccountService } from '../../../core/services/account/account.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { UserService } from '../../../core/services/user/user.service';
import { CreatePage } from './create-page';

describe('CreatePage', () => {
  let fixture: ComponentFixture<CreatePage>;
  let router: Router;

  const authService = {
    update: vi.fn(),
    updateAccount: vi.fn(),
  };

  const accountService = {
    findCurrent: vi.fn().mockReturnValue(of({ id: 'account-id' })),
  };

  const userService = {
    create: vi.fn().mockReturnValue(of({ id: 'user-id' })),
  };

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CreatePage],
      providers: [
        provideRouter([]),
        { provide: AccountService, useValue: accountService },
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(CreatePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    userService.create.mockReturnValue(of({ id: 'user-id' }));
    accountService.findCurrent.mockReturnValue(of({ id: 'account-id' }));
  });

  it('renders the account creation heading', async () => {
    await createComponent();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).toContain('Abra sua conta digital');
  });

  it('creates the account and authenticates the new user', async () => {
    await createComponent();

    fillInput('name', 'Usuário Teste');
    fillInput('email', 'user@auronix.com');
    fillInput('password', 'Password1!');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(userService.create).toHaveBeenCalledWith({
      name: 'Usuário Teste',
      email: 'user@auronix.com',
      password: 'Password1!',
    });
    expect(authService.update).toHaveBeenCalledWith({ id: 'user-id' });
    expect(authService.updateAccount).toHaveBeenCalledWith({ id: 'account-id' });
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('shows the backend error message when the creation fails', async () => {
    userService.create.mockReturnValue(
      throwError(() => ({
        error: {
          message: 'E-mail já utilizado',
        },
      })),
    );

    await createComponent();

    fillInput('name', 'Usuário Teste');
    fillInput('email', 'user@auronix.com');
    fillInput('password', 'Password1!');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const button = nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;

    expect(nativeElement.textContent).toContain('E-mail já utilizado');
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain('Criar conta');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not submit when the form is invalid', async () => {
    await createComponent();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(userService.create).not.toHaveBeenCalled();
    expect(authService.update).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  function fillInput(id: string, value: string): void {
    const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }
});
