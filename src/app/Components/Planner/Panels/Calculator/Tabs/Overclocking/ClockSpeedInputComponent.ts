import {Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import {Formulas} from '@src/Model/Planner/Formulas';

/**
 * A clock-speed field (1–250%, 4-decimal precision) with the common presets
 * appended as one-click buttons. step="any" keeps the browser's up/down
 * arrows at ±1 while still allowing fractional values to be typed.
 */
@Component({
	selector: 'clock-speed-input',
	templateUrl: './ClockSpeedInputComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
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
