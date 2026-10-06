import {Component, ChangeDetectionStrategy, computed} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faUpRightFromSquare} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {CodexBrowserComponent} from '@src/Components/Codex/CodexBrowserComponent';
import {CodexNavigation} from '@src/Components/Codex/CodexNavigation';
import {CodexSearchBoxComponent} from '@src/Components/Codex/CodexSearchBoxComponent';
import {CodexSearchResultsComponent} from '@src/Components/Codex/CodexSearchResultsComponent';
import {CodexSearchState} from '@src/Components/Codex/CodexSearchState';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';
import {VersionManager} from '@src/Model/Data/VersionManager';

@Component({
	selector: 'planner-codex',
	templateUrl: './PlannerCodexComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	providers: [CodexSearchState],
	imports: [
		RouterLink,
		FaIconComponent,
		AppTooltipDirective,
		CodexBrowserComponent,
		CodexSearchBoxComponent,
		CodexSearchResultsComponent,
	],
	// The toolbar is sticky inside the panel's scroll container, so it needs an opaque background.
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
