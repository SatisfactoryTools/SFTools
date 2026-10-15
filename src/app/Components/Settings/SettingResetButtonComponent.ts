import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faRotateLeft} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {SettingsCategory} from '@src/Model/Settings/SettingsCategory';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

/** Shows only while the setting differs from its default, so it doubles as the "changed" marker. */
@Component({
	selector: 'setting-reset-button',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [AppTooltipDirective, FaIconComponent],
	template: `
		@if (!isDefault) {
			<button
				type="button"
				class="btn btn-link btn-sm p-0 lh-1 setting-reset"
				tooltip="Back to the default" container="body" placement="top"
				aria-label="Back to the default"
				(click)="$event.preventDefault(); reset()"
			><fa-icon [icon]="faRotateLeft"></fa-icon></button>
		}
	`,
	styles: [`
		:host {
			display: inline-flex;
			vertical-align: middle;
			margin-left: 0.4rem;
		}
		.setting-reset {
			color: #8fa3b8;
			font-size: 0.8rem;
			text-decoration: none;
		}
		.setting-reset:hover {
			color: #4c9be8;
		}
	`],
})
export class SettingResetButtonComponent
{

	@Input({required: true}) public category!: SettingsCategory;
	@Input({required: true}) public field = '';
	@Input() public key: string | null = null;

	public readonly faRotateLeft = faRotateLeft;

	public constructor(private readonly settings: SettingsManager)
	{
	}

	public get isDefault(): boolean
	{
		return this.settings.isFieldDefault(this.category, this.field, this.key);
	}

	public reset(): void
	{
		this.settings.resetField(this.category, this.field, this.key);
	}

}
