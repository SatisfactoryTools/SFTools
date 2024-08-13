import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {Mod} from '@src/Model/API/Schema/Mods/Mod';
import {ModVersion} from '@src/Model/API/Schema/Mods/ModVersion';

@Injectable({providedIn: 'root'})
export class ModsApiService
{

	private readonly base = `${env.apiUrl}/v1/mods`;

	public constructor(private readonly http: HttpClient)
	{
	}

	/** Public mods, plus the requesting user's own when authenticated. */
	public listMods(): Observable<Mod[]>
	{
		return this.http.get<Mod[]>(this.base);
	}

	public getMod(id: string): Observable<Mod>
	{
		return this.http.get<Mod>(`${this.base}/${id}`);
	}

	/** Mods are created private; the public flag is admin-managed and never sent from here. */
	public createMod(name: string): Observable<Mod>
	{
		return this.http.post<Mod>(this.base, {name});
	}

	public updateMod(id: string, fields: {name?: string}): Observable<Mod>
	{
		return this.http.put<Mod>(`${this.base}/${id}`, fields);
	}

	public deleteMod(id: string): Observable<void>
	{
		return this.http.delete<void>(`${this.base}/${id}`);
	}

	public createModVersion(modId: string, name: string, data: object | null): Observable<ModVersion>
	{
		return this.http.post<ModVersion>(`${this.base}/${modId}/versions`, {name, data});
	}

	/** `data: null` clears the uploaded data; omitting `data` leaves it unchanged. */
	public updateModVersion(modId: string, versionId: string, fields: {name?: string; data?: object | null}): Observable<ModVersion>
	{
		return this.http.put<ModVersion>(`${this.base}/${modId}/versions/${versionId}`, fields);
	}

	public deleteModVersion(modId: string, versionId: string): Observable<void>
	{
		return this.http.delete<void>(`${this.base}/${modId}/versions/${versionId}`);
	}

	/**
	 * The version's uploaded data file. Served statically and regenerated in
	 * place on updates, so a cache-busting parameter keeps edits fresh.
	 */
	public getModVersionData(versionId: string): Observable<unknown>
	{
		return this.http.get<unknown>(`${env.apiUrl}/data/mods/${versionId}.json`, {params: {t: Date.now().toString()}});
	}

}
