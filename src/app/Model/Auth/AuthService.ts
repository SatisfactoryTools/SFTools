import {Injectable, Signal, WritableSignal, computed, signal} from '@angular/core';
import {TokenResponse} from '@src/Model/API/Schema/Auth/TokenResponse';
import {AppStorage} from '@src/Model/Storage/AppStorage';
import {UnsyncedPlanRescue} from '@src/Model/Planner/UnsyncedPlanRescue';
import {OfflineMirrorBackend} from '@src/Model/Sync/OfflineMirrorBackend';

@Injectable({providedIn: 'root'})
export class AuthService
{

	private readonly accessTokenSignal: WritableSignal<string | null>;
	private readonly loginSignal: WritableSignal<string | null>;

	public readonly accessToken: Signal<string | null>;
	public readonly currentLogin: Signal<string | null>;
	public readonly isAuthenticated: Signal<boolean>;
	/** Third-party sign-ins have no username: their stored login is a "via Discord" placeholder, so this is null for them. */
	public readonly displayName: Signal<string | null>;

	public constructor(private readonly storage: AppStorage)
	{
		this.accessTokenSignal = signal(this.storage.getItem('auth.accessToken'));
		this.loginSignal = signal(this.storage.getItem('auth.login'));
		this.accessToken = this.accessTokenSignal.asReadonly();
		this.currentLogin = this.loginSignal.asReadonly();
		this.isAuthenticated = computed(() => this.accessToken() !== null);
		this.displayName = computed(() => {
			const login = this.currentLogin();
			return login === null || login.startsWith('via ') ? null : login;
		});
	}

	public storeSession(login: string, response: TokenResponse): void
	{
		const expiresAt = Date.now() + response.expiresIn * 1000;
		this.storage.setItem('auth.accessToken', response.accessToken);
		this.storage.setItem('auth.refreshToken', response.refreshToken);
		this.storage.setItem('auth.expiresAt', String(expiresAt));
		this.storage.setItem('auth.login', login);
		this.accessTokenSignal.set(response.accessToken);
		this.loginSignal.set(login);
	}

	public clearSession(): number
	{
		this.storage.removeItem('auth.accessToken');
		this.storage.removeItem('auth.refreshToken');
		this.storage.removeItem('auth.expiresAt');
		this.storage.removeItem('auth.login');
		// Offline copies of the account data leave with it, except edits that never reached the account.
		const rescued = new UnsyncedPlanRescue(this.storage).run();
		this.storage.keys(OfflineMirrorBackend.KEY_PREFIX).forEach(key => this.storage.removeItem(key));
		this.accessTokenSignal.set(null);
		this.loginSignal.set(null);
		return rescued;
	}

	public getRefreshToken(): string | null
	{
		return this.storage.getItem('auth.refreshToken');
	}

	public isExpired(): boolean
	{
		const expiresAt = this.storage.getItem('auth.expiresAt');
		if (!expiresAt) return true;
		return Date.now() >= parseInt(expiresAt) - 30_000;
	}

}
