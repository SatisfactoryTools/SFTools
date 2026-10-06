import {Component, ChangeDetectionStrategy, computed, effect} from '@angular/core';
import {HelpBrowserComponent} from '@src/Components/Help/HelpBrowserComponent';
import {HelpNavigation} from '@src/Components/Help/HelpNavigation';
import {PageHelpNavigation} from '@src/Components/Help/PageHelpNavigation';
import {HelpManager} from '@src/Model/Help/HelpManager';
import {PageMetaService} from '@src/Model/Meta/PageMetaService';

@Component({
	templateUrl: './HelpPageComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	providers: [{provide: HelpNavigation, useClass: PageHelpNavigation}],
	imports: [HelpBrowserComponent],
	styles: `
		:host {
			display: block;
			container-type: inline-size;
			container-name: panel;
			/* The window scrolls under the fixed navbar, so sticky elements and scrolled-to headings stop there. */
			--help-sticky-top: 4.25rem;
		}
	`,
})
export class HelpPageComponent
{

	public constructor(navigation: HelpNavigation, helpManager: HelpManager, pageMeta: PageMetaService)
	{
		// Keyed by the slug alone, so moving between sections of one article does not re-run it.
		const slug = computed(() => navigation.path().split('#')[0]);
		effect(() => {
			const article = slug() !== '' ? helpManager.summary(slug()) : null;
			if (article !== null) {
				pageMeta.set({
					title: `${article.title} – Help`,
					description: article.summary !== '' ? article.summary : 'Guides and reference for Satisfactory Tools.',
				});
			}
		});
	}

}
