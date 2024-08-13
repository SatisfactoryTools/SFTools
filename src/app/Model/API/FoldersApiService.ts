import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {FolderSchema} from '@src/Model/API/Schema/Plans/FolderSchema';

@Injectable({providedIn: 'root'})
export class FoldersApiService
{

	public constructor(private readonly http: HttpClient)
	{
	}

	public createFolder(versionId: string, id: string, name: string, parent: string | null, data?: string): Observable<FolderSchema>
	{
		return this.http.post<FolderSchema>(this.foldersBase(versionId), {id, name, parent, data});
	}

	/** General update guarded by the revision counter - the server answers 409 on a mismatch. */
	public updateFolder(versionId: string, id: string, revision: number, fields: {name?: string; data?: string}): Observable<FolderSchema>
	{
		return this.http.put<FolderSchema>(`${this.foldersBase(versionId)}/${id}`, {...fields, revision});
	}

	public moveFolder(versionId: string, id: string, parent: string | null): Observable<FolderSchema>
	{
		return this.http.post<FolderSchema>(`${this.foldersBase(versionId)}/${id}/move`, {parent});
	}

	public deleteFolder(versionId: string, id: string): Observable<void>
	{
		return this.http.delete<void>(`${this.foldersBase(versionId)}/${id}`);
	}

	private foldersBase(versionId: string): string
	{
		return `${env.apiUrl}/v1/versions/${versionId}/folders`;
	}

}
