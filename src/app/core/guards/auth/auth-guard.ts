import { inject, Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  GuardResult,
  MaybeAsync,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { UserService } from '../../services/user/user.service';
import { AccountService } from '../../services/account/account.service';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private readonly accountService = inject(AccountService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  public canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): MaybeAsync<GuardResult> {
    const isLoggedIn = this.authService.isLoggedIn();
    if (isLoggedIn) return true;

    return this.userService.decodeToken().pipe(
      switchMap((user) =>
        forkJoin({
          account: this.accountService.findCurrent(),
          user: of(user),
        }),
      ),
      map(({ account, user }) => {
        this.authService.update(user);
        this.authService.updateAccount(account);
        return true;
      }),
      catchError(() =>
        of(
          this.router.createUrlTree(['/user', 'login'], {
            queryParams: { redirectTo: state.url || '/' },
          }),
        ),
      ),
    );
  }
}
