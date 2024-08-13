import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {PlanSchema} from '@src/Model/API/Schema/Plans/PlanSchema';
import {PlansListResponse} from '@src/Model/API/Schema/Plans/PlansListResponse';

@Injectable({providedIn: 'root'})
export class PlansApiService
{

	public constructor(private readonly http: HttpClient)
	{
	}

	public listPlans(versionId: string): Observable<PlansListResponse>
	{
		return this.http.get<PlansListResponse>(this.plansBase(versionId));
	}

	public getPlan(versionId: string, id: string): Observable<PlanSchema>
	{
		return this.http.get<PlanSchema>(`${this.plansBase(versionId)}/${id}`);
	}

	public createPlan(versionId: string, id: string, name: string, folder: string | null, parent: string | null, data: string, description?: string): Observable<PlanSchema>
	{
		return this.http.post<PlanSchema>(this.plansBase(versionId), {id, name, folder, parent, data, description});
	}

	public updatePlan(versionId: string, id: string, revision: number, fields: {name?: string; description?: string | null; data?: string}): Observable<PlanSchema>
	{
		return this.http.put<PlanSchema>(`${this.plansBase(versionId)}/${id}`, {...fields, revision});
	}

	/** Makes the plan top-level, placed in the given folder (null for root). */
	public movePlan(versionId: string, id: string, folder: string | null): Observable<PlanSchema>
	{
		return this.http.post<PlanSchema>(`${this.plansBase(versionId)}/${id}/move`, {folder});
	}

	/** Makes the plan a subplan of the given plan. */
	public movePlanToParent(versionId: string, id: string, parent: string): Observable<PlanSchema>
	{
		return this.http.post<PlanSchema>(`${this.plansBase(versionId)}/${id}/move`, {parent});
	}

	/** Deletes the plan and, recursively, all its subplans. */
	public deletePlan(versionId: string, id: string): Observable<void>
	{
		return this.http.delete<void>(`${this.plansBase(versionId)}/${id}`);
	}

	private plansBase(versionId: string): string
	{
		return `${env.apiUrl}/v1/versions/${versionId}/plans`;
	}

}
