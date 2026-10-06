import {Component, ChangeDetectionStrategy, computed} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faUpRightFromSquare} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {HelpBrowserComponent} from '@src/Components/Help/HelpBrowserComponent';
import {HelpNavigation} from '@src/Components/Help/HelpNavigation';
import {PanelHelpNavigation} from '@src/Components/Help/PanelHelpNavigation';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';

@Component({
	selector: 'planner-help',
	templateUrl: './PlannerHelpComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	providers: [{provide: HelpNavigation, useClass: PanelHelpNavigation}],
	imports: [RouterLink, FaIconComponent, AppTooltipDirective, HelpBrowserComponent],
	// The toolbar is sticky inside the panel's scroll container, so it needs an opaque background.
	styles: `
		:host {
			display: block;
			/* Sticky things inside the panel stop below the pop-out toolbar. */
			--help-sticky-top: 3rem;
		}
		.help-toolbar {
			z-index: 5;
			background: #141824;
			border-bottom: 1px solid #222b3e;
		}
	`,
})
export class PlannerHelpComponent
{

	public readonly faUpRightFromSquare = faUpRightFromSquare;

	public readonly popOutLink = computed<string[]>(() => {
		const slug = this.navigation.slug();
		return slug === '' ? ['/', 'help'] : ['/', 'help', slug];
	});

	public readonly popOutFragment = computed<string | undefined>(() => this.navigation.anchor() || undefined);

	public constructor(
		private readonly navigation: HelpNavigation,
		public readonly layout: PanelLayoutService,
	)
	{
	}

}
