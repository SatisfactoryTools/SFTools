import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {env} from '@env/env';
import {HelpManifest} from '@src/Model/API/Schema/Help/HelpManifest';

@Injectable({providedIn: 'root'})
export class HelpApiService
{

	public static readonly FILES = `${env.apiUrl}/data/help`;

	private readonly base = `${env.apiUrl}/v1/help`;

	public constructor(private readonly http: HttpClient)
	{
	}

	public loadManifest(): Observable<HelpManifest | null>
	{
		return this.http.get<HelpManifest>(`${HelpApiService.FILES}/index.json`).pipe(
			catchError(() => this.http.get<HelpManifest>(this.base)),
			catchError(() => of(null)),
		);
	}

	/** The manifest timestamp cache-busts the article file after an edit. */
	public articleUrl(slug: string, generatedAt: string): string
	{
		return `${HelpApiService.FILES}/articles/${encodeURIComponent(slug)}.json?v=${encodeURIComponent(generatedAt)}`;
	}

	public assetUrl(path: string): string
	{
		return `${env.apiUrl}/${path.replace(/^\/+/, '')}`;
	}

}
