import {Injectable, Optional, Signal, computed} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {filter, take} from 'rxjs/operators';
import {SharesApiService} from '@src/Model/API/SharesApiService';
import {SharePayload} from '@src/Model/API/Schema/Shares/SharePayload';
import {AuthService} from '@src/Model/Auth/AuthService';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';
import {NotificationService} from '@src/Model/NotificationService';
import {DataBackend} from '@src/Model/Sync/DataBackend';
import {OfflineMirrorBackend} from '@src/Model/Sync/OfflineMirrorBackend';
import {PreferRemoteOfflineMerger} from '@src/Model/Sync/PreferRemoteOfflineMerger';
import {LocalStorageDataBackend} from '@src/Model/Sync/LocalStorageDataBackend';
import {SyncableService} from '@src/Model/Sync/SyncableService';
import {MergeVisitedSharesConflictResolver} from '@src/Model/Shares/MergeVisitedSharesConflictResolver';
import {ShareTreeCache} from '@src/Model/Shares/ShareTreeCache';
import {VisitedShare} from '@src/Model/Shares/VisitedShare';
import {VisitedSharesApiDataBackend} from '@src/Model/Shares/VisitedSharesApiDataBackend';
import {AppStorage} from '@src/Model/Storage/AppStorage';
import {VISITED_SHARES_CAP, VisitedShareStore} from '@src/Model/Shares/VisitedShareStore';

@Injectable({providedIn: 'root'})
export class VisitedSharesManager extends SyncableService<VisitedShareStore>
{

	public readonly visitedShares: Signal<VisitedShare[]> = computed(() => this.data().shares);

	private pendingVisit: SharePayload | null = null;

	public constructor(
		authService: AuthService,
		sharesApi: SharesApiService,
		notifications: NotificationService,
		private readonly shareTrees: ShareTreeCache,
		storage: AppStorage,
		connectivity: ConnectivityService,
		@Optional() desktop: DesktopBridge | null,
	)
	{
		const apiBackend = new VisitedSharesApiDataBackend(sharesApi, notifications);
		// Offline the desktop app shows the list as last loaded.
		const remoteBackend: DataBackend<VisitedShareStore> = desktop === null ? apiBackend : new OfflineMirrorBackend<VisitedShareStore>(
			apiBackend,
			null,
			storage,
			'visitedShares',
			() => '',
			new PreferRemoteOfflineMerger<VisitedShareStore>(),
			connectivity,
			notifications,
			'shared plans',
		);
		super(
			authService,
			new LocalStorageDataBackend<VisitedShareStore>(storage, 'sftools.visitedShares'),
			remoteBackend,
			new MergeVisitedSharesConflictResolver(),
			{shares: []},
			notifications,
			'shared plans',
		);
		// A visit can arrive while the initial load is in flight and would be overwritten by it, so it waits for the load.
		// Anonymous entries are adopted here too: onLogin does not cover a page load that starts authenticated.
		toObservable(this.loaded).pipe(filter(Boolean), take(1)).subscribe(() => {
			if (this.pendingVisit !== null) {
				const payload = this.pendingVisit;
				this.pendingVisit = null;
				this.recordVisit(payload);
			}
			if (authService.isAuthenticated()) {
				this.adoptLocalEntries();
			}
		});
	}

	private adoptLocalEntries(): void
	{
		this.localBackend.load().subscribe(local => {
			if (local === null || local.shares.length === 0) {
				return;
			}
			new MergeVisitedSharesConflictResolver().resolve({local, remote: this.data()}).subscribe(merged => {
				this.persist(merged);
				this.localBackend.clear().subscribe();
			});
		});
	}

	/** A repeat visit keeps visitedAt as is, so it neither re-syncs nor reorders the list; it only fills in a missing icon. */
	public recordVisit(payload: SharePayload): void
	{
		if (!this.loaded()) {
			this.pendingVisit = payload;
			return;
		}
		const existing = this.data().shares.find(share => share.share === payload.share);
		if (existing) {
			if (existing.iconClassName === undefined && payload.type === 'plan') {
				const iconClassName = this.shareTrees.buildTree(payload).iconClassName;
				this.persist({shares: this.data().shares.map(share => share === existing ? {...share, iconClassName} : share)});
			}
			return;
		}
		const entry: VisitedShare = {
			share: payload.share,
			type: payload.type,
			name: payload.root.name,
			sharedAt: payload.sharedAt,
			visitedAt: new Date().toISOString(),
			version: payload.version,
			iconClassName: payload.type === 'plan' ? this.shareTrees.buildTree(payload).iconClassName : undefined,
		};
		this.persist({shares: [entry, ...this.data().shares].slice(0, VISITED_SHARES_CAP)});
	}

	public remove(shareUuid: string): void
	{
		this.persist({shares: this.data().shares.filter(share => share.share !== shareUuid)});
	}

}
