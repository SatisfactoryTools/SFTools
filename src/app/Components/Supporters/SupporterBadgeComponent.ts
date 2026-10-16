import {Component, ChangeDetectionStrategy, Input, Signal, computed} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faHeart} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

@Component({
	selector: 'supporter-badge',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, AppTooltipDirective],
	// Hiding the host, not just the icon, so spacing set on it by the parent goes too.
	host: {'[style.display]': "visible() ? null : 'none'"},
	template: `<span class="supporter-badge" [tooltip]="tooltip" container="body" [placement]="placement" [attr.aria-label]="tooltip" role="img"><fa-icon [icon]="faHeart"></fa-icon></span>`,
	styles: [`
		:host {
			display: inline-flex;
			flex-shrink: 0;
		}
		.supporter-badge {
			display: inline-flex;
			align-items: center;
			color: #e8b83f;
			font-size: 0.85em;
			cursor: default;
		}
	`],
})
export class SupporterBadgeComponent
{

	@Input() public tooltip = 'Shared by a supporter of Satisfactory Tools';

	@Input() public placement: 'top' | 'bottom' | 'left' | 'right' = 'top';

	public readonly faHeart = faHeart;

	public readonly visible: Signal<boolean>;

	public constructor(settings: SettingsManager)
	{
		this.visible = computed(() => settings.planner().supporterHearts);
	}

}
