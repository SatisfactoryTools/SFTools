import {Injectable, Signal, computed} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {filter, take} from 'rxjs/operators';
import {SharesApiService} from '@src/Model/API/SharesApiService';
import {SharePayload} from '@src/Model/API/Schema/Shares/SharePayload';
import {AuthService} from '@src/Model/Auth/AuthService';
import {NotificationService} from '@src/Model/NotificationService';
import {LocalStorageDataBackend} from '@src/Model/Sync/LocalStorageDataBackend';
import {SyncableService} from '@src/Model/Sync/SyncableService';
import {MergeVisitedSharesConflictResolver} from '@src/Model/Shares/MergeVisitedSharesConflictResolver';
import {ShareTreeCache} from '@src/Model/Shares/ShareTreeCache';
import {VisitedShare} from '@src/Model/Shares/VisitedShare';
import {VisitedSharesApiDataBackend} from '@src/Model/Shares/VisitedSharesApiDataBackend';
import {VISITED_SHARES_CAP, VisitedShareStore} from '@src/Model/Shares/VisitedShareStore';

/**
 * The "Shared plans" list: every share link the user has opened, most
 * recently ADDED first, capped (oldest evicted). Reopening a listed share
 * leaves it where it is - the order is stable, so rows do not jump around
 * while the user works through the list (visitedAt is the first visit).
 * Entries leave the list when the share is copied into the user's own
 * plans ("move" semantics) or removed by hand - both are non-destructive,
 * shares are permanent and reopening the link brings the entry back.
 * Anonymous users keep the list in localStorage; login merges it into the
 * account.
 */
@Injectable({providedIn: 'root'})
export class VisitedSharesManager extends SyncableService<VisitedShareStore>
{

	public readonly visitedShares: Signal<VisitedShare[]> = computed(() => this.data().shares);

	/** A visit recorded before the initial backend load settled - applied right after it does. */
	private pendingVisit: SharePayload | null = null;

	public constructor(
		authService: AuthService,
		sharesApi: SharesApiService,
		notifications: NotificationService,
		private readonly shareTrees: ShareTreeCache,
	)
	{
		super(
			authService,
			new LocalStorageDataBackend<VisitedShareStore>('sftools.visitedShares'),
			new VisitedSharesApiDataBackend(sharesApi, notifications),
			new MergeVisitedSharesConflictResolver(),
			{shares: []},
		);
		// Opening a share link is often this service's very first use, so the
		// visit can arrive while the initial load is still in flight - and the
		// load result would overwrite it. Held back until the load settles.
		// The same moment adopts anonymous localStorage entries into the
		// account: onLogin only covers a login that happens while this
		// service is alive, not a fresh page load that starts authenticated.
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

	/** Merges leftover anonymous visits into the account list, then clears the local copy. */
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

	/**
	 * A first visit adds the share at the top of the list, snapshotting its
	 * metadata from the loaded payload. A repeat visit keeps the entry in
	 * place and its visitedAt as is (so no re-sync and no reordering - on
	 * this device, on the server, or after a reload), only filling in an
	 * icon the entry still lacks.
	 */
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
