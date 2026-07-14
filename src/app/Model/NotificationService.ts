import {Injectable, Signal, WritableSignal, signal} from '@angular/core';
import {NotificationType} from '@src/Model/NotificationType';

@Injectable({providedIn: 'root'})
export class NotificationService
{

	private readonly messageSignal: WritableSignal<string | null> = signal(null);
	public readonly message: Signal<string | null> = this.messageSignal.asReadonly();

	private readonly typeSignal: WritableSignal<NotificationType> = signal('error');
	public readonly type: Signal<NotificationType> = this.typeSignal.asReadonly();

	private timer: ReturnType<typeof setTimeout> | null = null;

	/** Errors and warnings - the red toast. Confirmations go through showSuccess. */
	public show(message: string, duration = 6000): void
	{
		this.display(message, 'error', duration);
	}

	public showSuccess(message: string, duration = 6000): void
	{
		this.display(message, 'success', duration);
	}

	public dismiss(): void
	{
		if (this.timer) clearTimeout(this.timer);
		this.messageSignal.set(null);
	}

	private display(message: string, type: NotificationType, duration: number): void
	{
		if (this.timer) clearTimeout(this.timer);
		this.typeSignal.set(type);
		this.messageSignal.set(message);
		this.timer = setTimeout(() => this.messageSignal.set(null), duration);
	}

}
