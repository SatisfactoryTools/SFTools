import {Component, ChangeDetectionStrategy, computed} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faUpRightFromSquare} from '@fortawesome/free-solid-svg-icons';
import {TooltipDirective} from 'ngx-bootstrap/tooltip';
import {CodexBrowserComponent} from '@src/Components/Codex/CodexBrowserComponent';
import {CodexNavigation} from '@src/Components/Codex/CodexNavigation';
import {VersionManager} from '@src/Model/Data/VersionManager';

/**
 * The codex as a planner panel: the shared browser plus a pop-out button
 * that continues at the same codex path on the fullscreen page.
 */
@Component({
	selector: 'planner-codex',
	templateUrl: './PlannerCodexComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [RouterLink, FaIconComponent, TooltipDirective, CodexBrowserComponent],
})
export class PlannerCodexComponent
{

	public readonly faUpRightFromSquare = faUpRightFromSquare;

	public readonly popOutLink = computed<string[] | null>(() => {
		const version = this.versionManager.activeVersion();
		if (version === null) {
			return null;
		}
		return [
			'/', this.versionManager.urlSlug(version), 'codex',
			...this.navigation.path().split('/').filter(segment => segment !== ''),
		];
	});

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly navigation: CodexNavigation,
	)
	{
	}

}
