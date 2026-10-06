import {Component, ChangeDetectionStrategy, EventEmitter, Input, Optional, Output, computed, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCircleQuestion} from '@fortawesome/free-solid-svg-icons';
import {ActivatedRoute, Router, UrlTree} from '@angular/router';
import {AvailableBSPositions} from 'ngx-bootstrap/positioning';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {HelpButtonTarget} from '@src/Components/Help/HelpButtonTarget';
import {HelpNavigation} from '@src/Components/Help/HelpNavigation';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';
import {HelpManager} from '@src/Model/Help/HelpManager';
import {HelpTopicId} from '@src/Model/Help/HelpTopicId';
import {HelpTopicRegistry} from '@src/Model/Help/HelpTopicRegistry';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

@Component({
	selector: 'help-button',
	templateUrl: './HelpButtonComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, AppTooltipDirective],
	styles: `
		:host {
			display: inline-flex;
		}
		.help-button {
			color: var(--bs-blue);
			font-size: 0.85em;
			line-height: 1;
			cursor: pointer;
		}
		.help-button:hover {
			color: #85c0f5;
		}
	`,
})
export class HelpButtonComponent
{

	public readonly faCircleQuestion = faCircleQuestion;

	private readonly topicSignal = signal<HelpTopicId | ''>('');

	@Input({required: true})
	public set topic(value: HelpTopicId)
	{
		this.topicSignal.set(value);
	}

	@Output()
	public readonly opened = new EventEmitter<void>();

	@Input()
	public placement: AvailableBSPositions = 'top';

	protected readonly article = computed<HelpButtonTarget | null>(() => {
		if (!this.settings.planner().helpButtons) {
			return null;
		}
		const id = this.topicSignal();
		const topic = id === '' ? null : this.topics.resolve(id);
		const summary = topic === null ? null : this.help.summary(topic.slug);
		return topic === null || summary === null
			? null
			: {path: HelpNavigation.pathFor(topic.slug, topic.anchor), title: summary.title};
	});

	protected readonly href = computed<string | null>(() => {
		const target = this.article();
		if (target === null) {
			return null;
		}
		return this.router.serializeUrl(this.urlTree(target.path));
	});

	public constructor(
		private readonly help: HelpManager,
		private readonly topics: HelpTopicRegistry,
		private readonly settings: SettingsManager,
		private readonly router: Router,
		private readonly route: ActivatedRoute,
		@Optional() private readonly panelLayout: PanelLayoutService | null,
	)
	{
	}

	protected open(event: MouseEvent): boolean
	{
		if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
			return true;
		}

		const target = this.article();
		if (target === null) {
			return true;
		}

		event.preventDefault();
		void this.router.navigateByUrl(this.urlTree(target.path));
		// The panel may be closed, or open behind another one - the URL alone would then change nothing visible.
		this.panelLayout?.focusPanel('help');
		this.opened.emit();
		return false;
	}

	private urlTree(path: string): UrlTree
	{
		if (this.panelLayout !== null) {
			return this.router.createUrlTree([], {
				relativeTo: this.route,
				queryParams: {help: path},
				queryParamsHandling: 'merge',
			});
		}

		const [slug, anchor] = path.split('#');
		return this.router.createUrlTree(['/', 'help', slug], {fragment: anchor});
	}

}
