import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { email, form, maxLength, minLength, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import { UserService } from '../../core/services/user/user.service';
import { CustomInput } from '../../shared/components/ui/custom-input/custom-input';
import { PageHeader } from '../../shared/components/ui/page-header/page-header';
import { formatCurrency } from '../../shared/utils/format-currency';
import { formatDateTime } from '../../shared/utils/format-date-time';
import { httpErrorMessage } from '../../shared/utils/http-error-message';

interface ProfileFormValue {
  email: string;
  name: string;
}

@Component({
  selector: 'app-profile-page',
  imports: [CustomInput, PageHeader, RouterLink],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isLoggingOut = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly user = this.authService.data;
  protected readonly account = this.authService.account;

  private readonly profileFormValue = signal<ProfileFormValue>({
    email: this.user()?.email ?? '',
    name: this.user()?.name ?? '',
  });

  protected readonly balanceLabel = computed(() => formatCurrency(this.authService.balance()));
  protected readonly profileForm = form(this.profileFormValue, (schema) => {
    required(schema.name, { message: 'Digite seu nome' });
    minLength(schema.name, 2, { message: 'Digite um nome com pelo menos 2 caracteres' });
    maxLength(schema.name, 150, { message: 'Digite um nome com até 150 caracteres' });

    required(schema.email, { message: 'Digite um e-mail' });
    email(schema.email, { message: 'Digite um e-mail válido' });
  });
  protected readonly userCreatedAt = computed(() => {
    const createdAt = this.user()?.createdAt;
    return createdAt ? formatDateTime(createdAt) : '-';
  });

  public logout(): void {
    if (this.isLoggingOut()) return;

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isLoggingOut.set(true);

    this.userService.logout().subscribe({
      next: () => {
        this.authService.clear();
        this.isLoggingOut.set(false);
        this.router.navigate(['/user/login']);
      },
      error: ({ error }) => {
        this.errorMessage.set(httpErrorMessage(error, 'Não foi possível encerrar sua sessão'));
        this.isLoggingOut.set(false);
      },
    });
  }

  public save(event: Event): void {
    event.preventDefault();

    if (this.profileForm().invalid() || this.isSaving()) return;

    const currentUser = this.user();
    if (!currentUser) return;

    const name = this.profileFormValue().name.trim();
    const emailAddress = this.profileFormValue().email.trim();

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSaving.set(true);

    this.userService
      .update({
        email: emailAddress,
        name,
      })
      .subscribe({
        next: () => {
          const updatedUser = {
            ...currentUser,
            email: emailAddress,
            name,
          };

          this.authService.update(updatedUser);
          const account = this.account();
          if (account) this.authService.updateAccount({ ...account, user: updatedUser });
          this.successMessage.set('Perfil atualizado com sucesso');
          this.isSaving.set(false);
        },
        error: ({ error }) => {
          this.errorMessage.set(httpErrorMessage(error, 'Não foi possível atualizar o perfil'));
          this.isSaving.set(false);
        },
      });
  }
}
