import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { email, form, maxLength, minLength, pattern, required } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { AccountService } from '../../../core/services/account/account.service';
import { UserService } from '../../../core/services/user/user.service';
import { CustomInput } from '../../../shared/components/ui/custom-input/custom-input';
import { LoginUserDto } from '../../../shared/dto/user/login-user.dto.ts';
import { httpErrorMessage } from '../../../shared/utils/http-error-message';
import { switchMap, map } from 'rxjs';

@Component({
  selector: 'app-login-page',
  imports: [CustomInput, NgOptimizedImage, RouterLink],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isLoading = signal(false);

  private readonly authService = inject(AuthService);
  private readonly accountService = inject(AccountService);
  private readonly redirectRoute = inject(ActivatedRoute).snapshot.queryParamMap.get('redirectTo');
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  private readonly loginUserDto = signal<LoginUserDto>({
    email: '',
    password: '',
  });

  protected readonly loginUserForm = form(this.loginUserDto, (schema) => {
    required(schema.email, { message: 'Digite um e-mail' });
    email(schema.email, { message: 'Digite um e-mail válido' });

    required(schema.password, { message: 'Digite uma senha' });
    minLength(schema.password, 8, { message: 'A senha deve conter no mínimo 8 caracteres' });
    maxLength(schema.password, 72, { message: 'A senha deve conter no máximo 72 caracteres' });
    pattern(schema.password, /[A-Z]/, { message: 'Deve conter letra maiúscula' });
    pattern(schema.password, /[a-z]/, { message: 'Deve conter letra minúscula' });
    pattern(schema.password, /\d/, { message: 'Deve conter número' });
    pattern(schema.password, /[^A-Za-z0-9]/, { message: 'Deve conter caractere especial' });
  });

  public submit(event: Event): void {
    event.preventDefault();

    if (this.loginUserForm().invalid() || this.isLoading()) return;

    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.userService
      .login(this.loginUserDto())
      .pipe(
        switchMap((user) =>
          this.accountService.findCurrent().pipe(map((account) => ({ account, user }))),
        ),
      )
      .subscribe({
      next: ({ account, user }) => {
        this.authService.update(user);
        this.authService.updateAccount(account);
        this.router.navigateByUrl(this.redirectRoute || '/');
      },
      error: ({ error }) => {
        this.errorMessage.set(httpErrorMessage(error, 'Não foi possível acessar sua conta'));
        this.isLoading.set(false);
      },
    });
  }
}
