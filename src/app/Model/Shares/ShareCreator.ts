import {Injectable} from '@angular/core';
import {Observable, map, throwError} from 'rxjs';
import {SharesApiService} from '@src/Model/API/SharesApiService';
import {ShareCreateRequest} from '@src/Model/API/Schema/Shares/ShareCreateRequest';
import {ShareType} from '@src/Model/API/Schema/Shares/ShareType';
import {AuthService} from '@src/Model/Auth/AuthService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanStore} from '@src/Model/Planner/PlanStore';
import {ShareTreeBuilder} from '@src/Model/Shares/ShareTreeBuilder';

/**
 * Creates snapshot share links. A plan the server already has is shared by id; one that
 * lives only in this browser - everything made while signed out, and the "On this
 * device" plans of a signed-in user - is sent along with the request instead (see
 * anonymous-shares.md), so sharing never needs an account.
 */
@Injectable({providedIn: 'root'})
export class ShareCreator
{

	public constructor(
		private readonly sharesApi: SharesApiService,
		private readonly versionManager: VersionManager,
		private readonly authService: AuthService,
		private readonly shareTreeBuilder: ShareTreeBuilder,
	)
	{
	}

	/**
	 * Freezes the folder/plan subtree into a share and returns the finished link.
	 * Errors carry a message meant for the user (the API writes its own for a tree it
	 * refuses - too big, too deep).
	 */
	public create(type: ShareType, id: string, store: PlanStore, deviceStore = false): Observable<string>
	{
		const version = this.versionManager.activeVersion();
		if (!version) {
			return throwError(() => new Error('Could not create the link - no game version is open.'));
		}

		const onServer = this.authService.isAuthenticated() && !deviceStore;
		const request = onServer
			? {version: version.id, type, id}
			: this.treeRequest(version.id, type, id, store);
		if (!request) {
			return throwError(() => new Error('Could not create the link - this plan could not be read.'));
		}

		return this.sharesApi.createShare(request).pipe(
			map(response => `${window.location.origin}/shared/${response.share}`),
		);
	}

	/** The share request carrying the tree itself; null when the row is not in the store any more. */
	private treeRequest(versionId: string, type: ShareType, id: string, store: PlanStore): ShareCreateRequest | null
	{
		if (type === 'plan') {
			const plan = store.plans.find(candidate => candidate.id === id);
			return plan ? {version: versionId, type, root: this.shareTreeBuilder.plan(plan, store)} : null;
		}
		const folder = store.folders.find(candidate => candidate.id === id);
		return folder ? {version: versionId, type, root: this.shareTreeBuilder.folder(folder, store)} : null;
	}

}
