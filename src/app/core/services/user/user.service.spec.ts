import {
  HttpInterceptorFn,
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let httpController: HttpTestingController;
  let service: UserService;

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
        UserService,
      ],
    });

    service = TestBed.inject(UserService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('creates users with credentials', () => {
    service
      .create({
        email: 'user@auronix.com',
        name: 'Usuário Teste',
        password: 'Password1!',
      })
      .subscribe();

    const request = httpController.expectOne('http://localhost:8080/user');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({
      email: 'user@auronix.com',
      name: 'Usuário Teste',
      password: 'Password1!',
    });

    request.flush({ id: 'user-id' });
  });

  it('sends login requests with credentials', () => {
    service.login({ email: 'user@auronix.com', password: 'Password1!' }).subscribe();

    const request = httpController.expectOne('http://localhost:8080/user/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({
      email: 'user@auronix.com',
      password: 'Password1!',
    });

    request.flush({ id: 'user-id' });
  });

  it('sends logout requests with credentials', () => {
    service.logout().subscribe();

    const request = httpController.expectOne('http://localhost:8080/user/logout');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);

    request.flush(null);
  });

  it('decodes the current session with credentials', () => {
    service.decodeToken().subscribe();

    const request = httpController.expectOne('http://localhost:8080/user');
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);

    request.flush({ id: 'user-id' });
  });

  it('updates the current user with credentials', () => {
    service
      .update({
        email: 'updated@auronix.com',
        name: 'Usuário Atualizado',
      })
      .subscribe();

    const request = httpController.expectOne('http://localhost:8080/user');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({
      email: 'updated@auronix.com',
      name: 'Usuário Atualizado',
    });

    request.flush(null);
  });

  it('deletes the current user with credentials', () => {
    service.delete().subscribe();

    const request = httpController.expectOne('http://localhost:8080/user');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.withCredentials).toBe(true);

    request.flush(null);
  });
});
