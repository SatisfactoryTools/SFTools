import {Injectable, Signal, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {ModCatalogEntry} from '@src/Model/API/Schema/Mods/ModCatalogEntry';
import {ModSuggestionResult} from '@src/Model/API/Schema/Mods/ModSuggestionResult';

/** Public mods (owners hidden) and the "suggest a mod" form. */
@Injectable({providedIn: 'root'})
export class ModCatalogService
{

	private readonly base = `${env.apiUrl}/v1/mod-catalog`;

	private readonly entriesSignal = signal<ModCatalogEntry[] | null>(null);
	private readonly failedSignal = signal(false);
	private loading = false;

	public readonly entries: Signal<ModCatalogEntry[] | null> = this.entriesSignal.asReadonly();
	public readonly failed: Signal<boolean> = this.failedSignal.asReadonly();

	public constructor(private readonly http: HttpClient)
	{
	}

	public load(force = false): void
	{
		if (this.loading || (!force && this.entriesSignal() !== null)) {
			return;
		}
		this.loading = true;
		this.failedSignal.set(false);
		this.http.get<ModCatalogEntry[]>(`${this.base}/`).subscribe({
			next: entries => {
				this.loading = false;
				this.entriesSignal.set(Array.isArray(entries) ? entries : []);
			},
			error: () => {
				this.loading = false;
				this.failedSignal.set(true);
			},
		});
	}

	public suggest(link: string): Observable<ModSuggestionResult>
	{
		return this.http.post<ModSuggestionResult>(`${this.base}/suggestions`, {link});
	}

}
