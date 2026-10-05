import {Component, ChangeDetectionStrategy, effect} from '@angular/core';
import {CodexBrowserComponent} from '@src/Components/Codex/CodexBrowserComponent';
import {CodexNavigation} from '@src/Components/Codex/CodexNavigation';
import {PageCodexNavigation} from '@src/Components/Codex/PageCodexNavigation';
import {CodexMetaResolver} from '@src/Model/Meta/CodexMetaResolver';
import {PageMetaService} from '@src/Model/Meta/PageMetaService';

/**
 * Fullscreen codex at /[version]/codex/…, reached by popping the panel out.
 * The host is a `panel` container like the planner's panel scroll wrappers,
 * so the codex's narrow-panel layouts (stacked tables, smaller hero icons)
 * apply on a phone too. The tab title follows the entry shown (the codex
 * panel in the planner leaves the planner's title alone).
 */
@Component({
	templateUrl: './CodexPageComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	providers: [{provide: CodexNavigation, useClass: PageCodexNavigation}],
	imports: [CodexBrowserComponent],
	styles: `
		:host {
			display: block;
			container-type: inline-size;
			container-name: panel;
		}
	`,
})
export class CodexPageComponent
{

	public constructor(navigation: CodexNavigation, codexMeta: CodexMetaResolver, pageMeta: PageMetaService)
	{
		effect(() => {
			const meta = codexMeta.resolve(navigation.path());
			if (meta !== null) {
				pageMeta.set(meta);
			}
		});
	}

}
