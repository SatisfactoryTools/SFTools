import {Component, ChangeDetectionStrategy, Signal, effect, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {ActiveShareManager} from '@src/Model/Shares/ActiveShareManager';
import {PageMetaService} from '@src/Model/Meta/PageMetaService';
import {ShareMetaResolver} from '@src/Model/Meta/ShareMetaResolver';
import {SharePayload} from '@src/Model/API/Schema/Shares/SharePayload';
import {VersionManager} from '@src/Model/Data/VersionManager';

/**
 * The public share-link entry point (/shared/:shareId), kept working
 * forever. It resolves the share, silently adds its game version to the
 * viewer's list and records the visit (both via ActiveShareManager.prepare),
 * then forwards into the normal planner, which opens the share read-only.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [RouterLink],
	template: `
		<div class="container py-5 text-center">
			@if (error(); as message) {
				<div class="alert alert-danger d-inline-block">{{ message }}</div>
				<div><a routerLink="/">Back to the version list</a></div>
			} @else {
				<div class="spinner-border mb-3" role="status"></div>
				<div class="text-secondary">Opening shared plan…</div>
			}
		</div>
	`,
})
export class ShareRedirectComponent
{

	private readonly errorSignal = signal<string | null>(null);
	public readonly error: Signal<string | null> = this.errorSignal.asReadonly();

	private readonly payloadSignal = signal<SharePayload | null>(null);

	public constructor(
		route: ActivatedRoute,
		activeShare: ActiveShareManager,
		versionManager: VersionManager,
		router: Router,
		pageMeta: PageMetaService,
		shareMeta: ShareMetaResolver,
	)
	{
		// From an effect, so it lands after the router has applied the route's (default) title.
		effect(() => {
			const payload = this.payloadSignal();
			if (payload !== null) {
				pageMeta.set(shareMeta.resolve(payload));
			}
		});

		const shareId = route.snapshot.paramMap.get('shareId') ?? '';
		activeShare.prepare(shareId).subscribe({
			next: payload => {
				this.payloadSignal.set(payload);
				const version = versionManager.versions().find(v => v.id === payload.version.id);
				if (!version) {
					this.errorSignal.set('The game version of this shared plan is no longer available.');
					return;
				}
				void router.navigate(['/', versionManager.urlSlug(version), 'planner', 'shared', shareId], {replaceUrl: true});
			},
			error: () => this.errorSignal.set('This shared plan does not exist, or the link is broken.'),
		});
	}

}
