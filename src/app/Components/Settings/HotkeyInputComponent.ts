import {Component, ChangeDetectionStrategy, EventEmitter, Input, OnDestroy, Output} from '@angular/core';
import {HotkeyBinding} from '@src/Model/Hotkeys/HotkeyBinding';
import {HotkeyFormatter} from '@src/Model/Hotkeys/HotkeyFormatter';
import {HotkeyRegistration} from '@src/Model/Hotkeys/HotkeyRegistration';
import {HotkeyService} from '@src/Model/Hotkeys/HotkeyService';

/**
 * The key field of the hotkey settings: click it, press the combination you
 * want, and that becomes the key. Escape leaves it as it was.
 *
 * Every hotkey is parked while it records - otherwise pressing Del here would
 * also try to delete something on the canvas behind the settings page.
 */
@Component({
	selector: 'hotkey-input',
	templateUrl: './HotkeyInputComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: [`
		:host { display: inline-block; }
		.key-btn {
			min-width: 8.5rem;
			padding: 0.15rem 0.6rem;
			border: 1px solid #3a4658;
			border-radius: 5px;
			background: #1b2231;
			font-size: 0.85rem;
			font-family: inherit;
			color: #dfe5ec;
			cursor: pointer;
		}
		.key-btn:hover { border-color: #4f627f; }
		.key-btn.recording {
			border-color: #e0b56a;
			color: #e0b56a;
		}
		.key-btn.empty { color: #7d8ca5; }
		.key-btn.conflict { border-color: #d4663f; color: #e58a72; }
	`],
})
export class HotkeyInputComponent implements OnDestroy
{

	@Input() public binding: HotkeyBinding | null = null;

	/** Marks the field red - another action already uses this combination. */
	@Input() public conflict = false;

	@Output() public readonly changed = new EventEmitter<HotkeyBinding>();

	public recording = false;

	private block: HotkeyRegistration | null = null;

	public constructor(
		private readonly formatter: HotkeyFormatter,
		private readonly hotkeys: HotkeyService,
	)
	{
	}

	public ngOnDestroy(): void
	{
		this.stop();
	}

	public get text(): string
	{
		if (this.recording) {
			return 'Press a key…';
		}
		return this.formatter.format(this.binding) || 'No key';
	}

	public start(): void
	{
		if (!this.recording) {
			this.recording = true;
			this.block = this.hotkeys.block();
		}
	}

	public stop(): void
	{
		this.recording = false;
		this.block?.unregister();
		this.block = null;
	}

	public onKeyDown(event: KeyboardEvent): void
	{
		if (!this.recording) {
			return;
		}
		// Nothing here reaches the rest of the app while recording - not even
		// Tab, which would otherwise move focus away mid-capture.
		event.preventDefault();
		event.stopPropagation();
		if (event.key === 'Escape') {
			this.stop();
			return;
		}
		const binding = this.formatter.fromEvent(event);
		if (!binding) {
			return;
		}
		this.stop();
		this.changed.emit(binding);
	}

}
