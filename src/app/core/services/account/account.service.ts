import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Account } from '../../models/account';

declare const API_URL: string;

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private readonly apiUrl = API_URL + '/account';
  private readonly http = inject(HttpClient);

  public findCurrent(): Observable<Account> {
    return this.http.get<Account>(this.apiUrl);
  }

  public findIdByUserEmail(email: string): Observable<string> {
    const params = new HttpParams().set('email', email);
    return this.http.get<string>(this.apiUrl + '/email', { params });
  }
}
