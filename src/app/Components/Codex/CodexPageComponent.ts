import {Component, ChangeDetectionStrategy} from '@angular/core';
import {CodexBrowserComponent} from '@src/Components/Codex/CodexBrowserComponent';
import {CodexNavigation} from '@src/Components/Codex/CodexNavigation';
import {PageCodexNavigation} from '@src/Components/Codex/PageCodexNavigation';

/**
 * Fullscreen codex at /[version]/codex/…, reached by popping the panel out.
 * The host is a `panel` container like the planner's panel scroll wrappers,
 * so the codex's narrow-panel layouts (stacked tables, smaller hero icons)
 * apply on a phone too.
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

}
