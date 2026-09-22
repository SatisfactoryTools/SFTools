import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {HelpEditorArticle} from '@src/Model/API/Schema/Help/HelpEditorArticle';
import {HelpEditorArticleInput} from '@src/Model/API/Schema/Help/HelpEditorArticleInput';
import {HelpEditorCategory} from '@src/Model/API/Schema/Help/HelpEditorCategory';
import {HelpEditorImage} from '@src/Model/API/Schema/Help/HelpEditorImage';

/**
 * Writing side of the help API - everything here needs an account with the
 * help-editor flag. Each successful write rebuilds the static snapshot readers
 * load, so nothing else has to be published by hand.
 */
@Injectable({providedIn: 'root'})
export class HelpEditorApiService
{

	private readonly base = `${env.apiUrl}/v1/help/editor`;

	public constructor(private readonly http: HttpClient)
	{
	}

	/** Every article, drafts included, without bodies. */
	public listArticles(): Observable<HelpEditorArticle[]>
	{
		return this.http.get<HelpEditorArticle[]>(`${this.base}/articles`);
	}

	public getArticle(id: string): Observable<HelpEditorArticle>
	{
		return this.http.get<HelpEditorArticle>(`${this.base}/articles/${id}`);
	}

	public createArticle(article: HelpEditorArticleInput): Observable<HelpEditorArticle>
	{
		return this.http.post<HelpEditorArticle>(`${this.base}/articles`, article);
	}

	public updateArticle(id: string, article: HelpEditorArticleInput): Observable<HelpEditorArticle>
	{
		return this.http.put<HelpEditorArticle>(`${this.base}/articles/${id}`, article);
	}

	public deleteArticle(id: string): Observable<void>
	{
		return this.http.delete<void>(`${this.base}/articles/${id}`);
	}

	public listCategories(): Observable<HelpEditorCategory[]>
	{
		return this.http.get<HelpEditorCategory[]>(`${this.base}/categories`);
	}

	public createCategory(category: {slug: string; name: string; position?: number}): Observable<HelpEditorCategory>
	{
		return this.http.post<HelpEditorCategory>(`${this.base}/categories`, category);
	}

	public updateCategory(id: string, category: {slug?: string; name?: string; position?: number}): Observable<HelpEditorCategory>
	{
		return this.http.put<HelpEditorCategory>(`${this.base}/categories/${id}`, category);
	}

	public deleteCategory(id: string): Observable<void>
	{
		return this.http.delete<void>(`${this.base}/categories/${id}`);
	}

	public listImages(): Observable<HelpEditorImage[]>
	{
		return this.http.get<HelpEditorImage[]>(`${this.base}/images`);
	}

	/** `data` is the file base64-encoded, or a data: URL as FileReader produces it. */
	public uploadImage(fileName: string, data: string): Observable<HelpEditorImage>
	{
		return this.http.post<HelpEditorImage>(`${this.base}/images`, {fileName, data});
	}

	public deleteImage(id: string): Observable<void>
	{
		return this.http.delete<void>(`${this.base}/images/${id}`);
	}

	/** Rebuilds the reader's static files by hand - normally never needed. */
	public publish(): Observable<void>
	{
		return this.http.post<void>(`${this.base}/publish`, {});
	}

}
