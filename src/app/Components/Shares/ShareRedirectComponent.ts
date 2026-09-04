import {Component, ChangeDetectionStrategy, Signal, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {ActiveShareManager} from '@src/Model/Shares/ActiveShareManager';
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

	public constructor(
		route: ActivatedRoute,
		activeShare: ActiveShareManager,
		versionManager: VersionManager,
		router: Router,
	)
	{
		const shareId = route.snapshot.paramMap.get('shareId') ?? '';
		activeShare.prepare(shareId).subscribe({
			next: payload => {
				const version = versionManager.versions().find(v => v.id === payload.version.id);
				if (!version) {
					this.errorSignal.set('The game version this share was made for is no longer available.');
					return;
				}
				void router.navigate(['/', versionManager.urlSlug(version), 'planner', 'shared', shareId], {replaceUrl: true});
			},
			error: () => this.errorSignal.set('This share does not exist (or the link is malformed).'),
		});
	}

}
