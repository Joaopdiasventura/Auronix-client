import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CreateUserDto } from '../../../shared/dto/user/create-user.dto.ts';
import { Observable } from 'rxjs';
import { User } from '../../models/user';
import { LoginUserDto } from '../../../shared/dto/user/login-user.dto.ts';
import { UpdateUserDto } from '../../../shared/dto/user/update-user.dto.ts';

declare const API_URL: string;

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiUrl = API_URL + '/user';
  private readonly http = inject(HttpClient);

  public create(createUserDto: CreateUserDto): Observable<User> {
    return this.http.post<User>(this.apiUrl, createUserDto);
  }

  public login(loginUserDto: LoginUserDto): Observable<User> {
    return this.http.post<User>(this.apiUrl + '/login', loginUserDto);
  }

  public logout(): Observable<void> {
    return this.http.post<void>(this.apiUrl + '/logout', null);
  }

  public decodeToken(): Observable<User> {
    return this.http.get<User>(this.apiUrl);
  }

  public update(updateUserDto: UpdateUserDto): Observable<void> {
    return this.http.patch<void>(this.apiUrl, updateUserDto);
  }

  public delete(): Observable<void> {
    return this.http.delete<void>(this.apiUrl);
  }
}
