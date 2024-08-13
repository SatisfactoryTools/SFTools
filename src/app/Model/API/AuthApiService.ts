import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {TokenResponse} from '@src/Model/API/Schema/Auth/TokenResponse';

@Injectable({providedIn: 'root'})
export class AuthApiService
{

	private readonly base = `${env.apiUrl}/v1/auth`;

	public constructor(private readonly http: HttpClient)
	{
	}

	public register(login: string, email: string, password: string): Observable<void>
	{
		return this.http.post<void>(`${this.base}/register`, {login, email, password});
	}

	public login(login: string, password: string): Observable<TokenResponse>
	{
		return this.http.post<TokenResponse>(`${this.base}/login`, {login, password});
	}

	public refresh(refreshToken: string): Observable<TokenResponse>
	{
		return this.http.post<TokenResponse>(`${this.base}/refresh`, {refreshToken});
	}

	public logout(refreshToken?: string): Observable<void>
	{
		return this.http.post<void>(`${this.base}/logout`, {refreshToken});
	}

	public forgotPassword(email: string): Observable<void>
	{
		return this.http.post<void>(`${this.base}/forgot-password`, {email});
	}

	public resetPassword(token: string, password: string): Observable<void>
	{
		return this.http.post<void>(`${this.base}/reset-password`, {token, password});
	}

}
