import {Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import {Formulas} from '@src/Model/Planner/Formulas';

/** step="any" keeps the browser's arrows at ±1 while still allowing fractional values. */
@Component({
	selector: 'clock-speed-input',
	templateUrl: './ClockSpeedInputComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: [`
		:host { display: block; min-width: 0; }
		/* Plain nowrap rather than the .flex-nowrap utility: its !important
		   would also beat the narrow-panel override below. */
		.input-group { flex-wrap: nowrap; }
		@container panel (max-width: 300px) {
			.input-group {
				flex-wrap: wrap;
				gap: 0.25rem;
			}
			.input-group > .form-control {
				flex: 1 1 100%;
				width: 100%;
				border-radius: var(--bs-border-radius-sm) !important;
			}
			.input-group > .btn {
				flex: 1 1 auto;
				margin-left: 0 !important;
				border-radius: var(--bs-border-radius-sm) !important;
			}
		}
	`],
})
export class ClockSpeedInputComponent
{

	@Input() public value = 100;
	@Input() public inputId = '';
	@Output() public valueChange = new EventEmitter<number>();

	public readonly presets = [100, 150, 200, 250];

	public onInput(raw: string): void
	{
		const parsed = parseFloat(raw);
		if (!isFinite(parsed)) {
			return;
		}
		this.set(Formulas.clampClock(parsed));
	}

	public set(value: number): void
	{
		this.value = value;
		this.valueChange.emit(value);
	}

}
