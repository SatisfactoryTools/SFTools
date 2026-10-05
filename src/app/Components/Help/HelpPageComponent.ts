import {Component, ChangeDetectionStrategy, computed, effect} from '@angular/core';
import {HelpBrowserComponent} from '@src/Components/Help/HelpBrowserComponent';
import {HelpNavigation} from '@src/Components/Help/HelpNavigation';
import {PageHelpNavigation} from '@src/Components/Help/PageHelpNavigation';
import {HelpManager} from '@src/Model/Help/HelpManager';
import {PageMetaService} from '@src/Model/Meta/PageMetaService';

/**
 * Fullscreen help at /help/…, reached from the navbar, a search result or by
 * popping the panel out. The host is a `panel` container like the planner's
 * panel scroll wrappers, so the reader lays itself out against the width it
 * actually has - one column on a phone, article list and contents beside the
 * text on a desktop. The tab title names the open article.
 */
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
			/* The page scrolls the window under the fixed navbar, so that is
			   where anything sticky - and a heading scrolled to - has to stop. */
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
