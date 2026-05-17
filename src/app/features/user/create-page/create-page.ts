import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { email, form, maxLength, minLength, pattern, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AccountService } from '../../../core/services/account/account.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { UserService } from '../../../core/services/user/user.service';
import { CustomInput } from '../../../shared/components/ui/custom-input/custom-input';
import { CreateUserDto } from '../../../shared/dto/user/create-user.dto.ts';
import { httpErrorMessage } from '../../../shared/utils/http-error-message';
import { map, switchMap } from 'rxjs';

@Component({
  selector: 'app-create-page',
  imports: [CustomInput, NgOptimizedImage, RouterLink],
  templateUrl: './create-page.html',
  styleUrl: './create-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePage {
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isLoading = signal(false);

  private readonly accountService = inject(AccountService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  private readonly createUserDto = signal<CreateUserDto>({
    email: '',
    name: '',
    password: '',
  });

  protected readonly createUserForm = form(this.createUserDto, (schema) => {
    required(schema.name, { message: 'Digite seu nome' });
    minLength(schema.name, 2, { message: 'Digite um nome com pelo menos 2 caracteres' });
    maxLength(schema.name, 150, { message: 'Digite um nome com até 150 caracteres' });

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

    if (this.createUserForm().invalid() || this.isLoading()) return;

    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.userService
      .create(this.createUserDto())
      .pipe(
        switchMap((user) =>
          this.accountService.findCurrent().pipe(map((account) => ({ account, user }))),
        ),
      )
      .subscribe({
      next: ({ account, user }) => {
        this.authService.update(user);
        this.authService.updateAccount(account);
        this.router.navigate(['/']);
      },
      error: ({ error }) => {
        this.errorMessage.set(httpErrorMessage(error, 'Não foi possível criar sua conta'));
        this.isLoading.set(false);
      },
    });
  }
}
