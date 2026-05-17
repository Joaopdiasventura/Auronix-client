import {
  HttpInterceptorFn,
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AccountService } from './account.service';

describe('AccountService', () => {
  let httpController: HttpTestingController;
  let service: AccountService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withFetch(),
          withInterceptors([
            (req, next): ReturnType<HttpInterceptorFn> => next(req.clone({ withCredentials: true })),
          ]),
        ),
        provideHttpClientTesting(),
        AccountService,
      ],
    });

    service = TestBed.inject(AccountService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('fetches the current account with credentials', () => {
    service.findCurrent().subscribe();

    const request = httpController.expectOne('http://localhost:8080/account');
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);

    request.flush({ id: 'account-id' });
  });

  it('finds account ids by user email with credentials', () => {
    service.findIdByUserEmail('user@auronix.com').subscribe();

    const request = httpController.expectOne(
      ({ url, params }) =>
        url == 'http://localhost:8080/account/email' &&
        params.get('email') == 'user@auronix.com',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);

    request.flush('account-id');
  });
});
