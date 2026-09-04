import {Component, ChangeDetectionStrategy, computed} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faUpRightFromSquare} from '@fortawesome/free-solid-svg-icons';
import {TooltipDirective} from 'ngx-bootstrap/tooltip';
import {CodexBrowserComponent} from '@src/Components/Codex/CodexBrowserComponent';
import {CodexNavigation} from '@src/Components/Codex/CodexNavigation';
import {CodexSearchBoxComponent} from '@src/Components/Codex/CodexSearchBoxComponent';
import {CodexSearchResultsComponent} from '@src/Components/Codex/CodexSearchResultsComponent';
import {CodexSearchState} from '@src/Components/Codex/CodexSearchState';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';
import {VersionManager} from '@src/Model/Data/VersionManager';

/**
 * The codex as a planner panel: a sticky toolbar (codex-scoped search plus a
 * pop-out button that continues at the same codex path on the fullscreen
 * page) above the shared browser; while a query is typed the search results
 * take the browser's place.
 */
@Component({
	selector: 'planner-codex',
	templateUrl: './PlannerCodexComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	providers: [CodexSearchState],
	imports: [
		RouterLink,
		FaIconComponent,
		TooltipDirective,
		CodexBrowserComponent,
		CodexSearchBoxComponent,
		CodexSearchResultsComponent,
	],
	// The toolbar sits inside the panel's scroll container, so it needs the
	// panel background to cover the content scrolling underneath it; the
	// border matches the panel tab bar's.
	styles: `
		:host {
			display: block;
		}
		.codex-toolbar {
			z-index: 5;
			background: #141824;
			border-bottom: 1px solid #222b3e;
		}
	`,
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
		public readonly layout: PanelLayoutService,
		public readonly search: CodexSearchState,
	)
	{
	}

}
