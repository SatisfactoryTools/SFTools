import {Component, ChangeDetectionStrategy} from '@angular/core';
import {CodexBrowserComponent} from '@src/Components/Codex/CodexBrowserComponent';
import {CodexNavigation} from '@src/Components/Codex/CodexNavigation';
import {PageCodexNavigation} from '@src/Components/Codex/PageCodexNavigation';

/** Fullscreen codex at /[version]/codex/…, reached by popping the panel out. */
@Component({
	templateUrl: './CodexPageComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	providers: [{provide: CodexNavigation, useClass: PageCodexNavigation}],
	imports: [CodexBrowserComponent],
})
export class CodexPageComponent
{

}
