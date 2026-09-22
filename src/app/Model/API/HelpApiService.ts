import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {env} from '@env/env';
import {HelpManifest} from '@src/Model/API/Schema/Help/HelpManifest';

/**
 * Reading side of the help API. Articles are served as static files written
 * by the backend on every edit; the `/v1/help` endpoints behind them serve the
 * same JSON and are only used when the snapshot has never been generated.
 */
@Injectable({providedIn: 'root'})
export class HelpApiService
{

	public static readonly FILES = `${env.apiUrl}/data/help`;

	private readonly base = `${env.apiUrl}/v1/help`;

	public constructor(private readonly http: HttpClient)
	{
	}

	/** Null when help is unavailable - the app then simply shows no help. */
	public loadManifest(): Observable<HelpManifest | null>
	{
		return this.http.get<HelpManifest>(`${HelpApiService.FILES}/index.json`).pipe(
			catchError(() => this.http.get<HelpManifest>(this.base)),
			catchError(() => of(null)),
		);
	}

	/**
	 * Where one article's file lives. The manifest's timestamp is appended so
	 * a published edit is picked up immediately despite any caching.
	 */
	public articleUrl(slug: string, generatedAt: string): string
	{
		return `${HelpApiService.FILES}/articles/${encodeURIComponent(slug)}.json?v=${encodeURIComponent(generatedAt)}`;
	}

	/** Absolute URL of an asset stored by the backend, e.g. an article screenshot. */
	public assetUrl(path: string): string
	{
		return `${env.apiUrl}/${path.replace(/^\/+/, '')}`;
	}

}
