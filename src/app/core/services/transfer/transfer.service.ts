import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CreateTransferDto } from '../../../shared/dto/transfer/create-transfer.dto.ts';
import { Observable } from 'rxjs';
import { Transfer } from '../../models/transfer';
import { PageDto } from '../../../shared/dto/page.dto';

declare const API_URL: string;

@Injectable({
  providedIn: 'root',
})
export class TransferService {
  private readonly apiUrl = API_URL + '/transaction';
  private readonly http = inject(HttpClient);

  public create(createTransferDto: CreateTransferDto): Observable<void> {
    return this.http.post<void>(this.apiUrl, createTransferDto);
  }

  public findById(id: string): Observable<Transfer> {
    return this.http.get<Transfer>(this.apiUrl + '/' + id);
  }

  public findMany(page: number, size: number): Observable<PageDto<Transfer>> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size))
      .set('sort', 'createdAt,desc');

    return this.http.get<PageDto<Transfer>>(this.apiUrl, {
      params,
    });
  }
}
