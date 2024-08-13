import {Injectable, Signal, WritableSignal, signal} from '@angular/core';

@Injectable({providedIn: 'root'})
export class NotificationService
{

	private readonly messageSignal: WritableSignal<string | null> = signal(null);
	public readonly message: Signal<string | null> = this.messageSignal.asReadonly();

	private timer: ReturnType<typeof setTimeout> | null = null;

	public show(message: string, duration = 6000): void
	{
		if (this.timer) clearTimeout(this.timer);
		this.messageSignal.set(message);
		this.timer = setTimeout(() => this.messageSignal.set(null), duration);
	}

	public dismiss(): void
	{
		if (this.timer) clearTimeout(this.timer);
		this.messageSignal.set(null);
	}

}
