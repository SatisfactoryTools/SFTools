import {Injectable, Signal, WritableSignal, computed, signal} from '@angular/core';
import {TokenResponse} from '@src/Model/API/Schema/Auth/TokenResponse';

@Injectable({providedIn: 'root'})
export class AuthService
{

	private readonly accessTokenSignal: WritableSignal<string | null>;
	private readonly loginSignal: WritableSignal<string | null>;

	public readonly accessToken: Signal<string | null>;
	public readonly currentLogin: Signal<string | null>;
	public readonly isAuthenticated: Signal<boolean>;

	public constructor()
	{
		this.accessTokenSignal = signal(localStorage.getItem('auth.accessToken'));
		this.loginSignal = signal(localStorage.getItem('auth.login'));
		this.accessToken = this.accessTokenSignal.asReadonly();
		this.currentLogin = this.loginSignal.asReadonly();
		this.isAuthenticated = computed(() => this.accessToken() !== null);
	}

	public storeSession(login: string, response: TokenResponse): void
	{
		const expiresAt = Date.now() + response.expiresIn * 1000;
		localStorage.setItem('auth.accessToken', response.accessToken);
		localStorage.setItem('auth.refreshToken', response.refreshToken);
		localStorage.setItem('auth.expiresAt', String(expiresAt));
		localStorage.setItem('auth.login', login);
		this.accessTokenSignal.set(response.accessToken);
		this.loginSignal.set(login);
	}

	public clearSession(): void
	{
		localStorage.removeItem('auth.accessToken');
		localStorage.removeItem('auth.refreshToken');
		localStorage.removeItem('auth.expiresAt');
		localStorage.removeItem('auth.login');
		this.accessTokenSignal.set(null);
		this.loginSignal.set(null);
	}

	public getRefreshToken(): string | null
	{
		return localStorage.getItem('auth.refreshToken');
	}

	public isExpired(): boolean
	{
		const expiresAt = localStorage.getItem('auth.expiresAt');
		if (!expiresAt) return true;
		return Date.now() >= parseInt(expiresAt) - 30_000;
	}

}
