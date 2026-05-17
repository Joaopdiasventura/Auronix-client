import {
  HttpInterceptorFn,
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TransferService } from './transfer.service';

describe('TransferService', () => {
  let httpController: HttpTestingController;
  let service: TransferService;

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
        TransferService,
      ],
    });

    service = TestBed.inject(TransferService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('creates transfers with credentials', () => {
    service.create({ payeeAccountId: 'payee-account-id', amount: 5000 }).subscribe();

    const request = httpController.expectOne('http://localhost:8080/transaction');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({
      payeeAccountId: 'payee-account-id',
      amount: 5000,
    });

    request.flush(null);
  });

  it('lists transfers using the Spring pagination contract', () => {
    service.findMany(0, 8).subscribe();

    const request = httpController.expectOne(
      ({ url, params }) =>
        url == 'http://localhost:8080/transaction' &&
        params.get('page') == '0' &&
        params.get('size') == '8' &&
        params.get('sort') == 'createdAt,desc',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);

    request.flush({
      content: [],
      number: 0,
      size: 8,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
      empty: true,
    });
  });

  it('fetches a transfer by id with credentials', () => {
    service.findById('transfer-id').subscribe();

    const request = httpController.expectOne('http://localhost:8080/transaction/transfer-id');
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);

    request.flush({ id: 'transfer-id' });
  });
});
