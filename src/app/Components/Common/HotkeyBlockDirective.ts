import {Directive, OnDestroy, OnInit} from '@angular/core';
import {HotkeyRegistration} from '@src/Model/Hotkeys/HotkeyRegistration';
import {HotkeyService} from '@src/Model/Hotkeys/HotkeyService';

/** For a dialog's backdrop: a key pressed over a dialog must not delete a node behind it. */
@Directive({
	selector: '[hotkeyBlock]',
})
export class HotkeyBlockDirective implements OnInit, OnDestroy
{

	private registration: HotkeyRegistration | null = null;

	public constructor(private readonly hotkeys: HotkeyService)
	{
	}

	public ngOnInit(): void
	{
		this.registration = this.hotkeys.block();
	}

	public ngOnDestroy(): void
	{
		this.registration?.unregister();
		this.registration = null;
	}

}
