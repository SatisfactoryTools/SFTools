export interface ConfirmRequest
{
	readonly message: string;
	readonly title?: string;
	/** The button that says yes, e.g. "Delete". Defaults to "OK". */
	readonly confirmLabel?: string;
	readonly cancelLabel?: string;
	/** A red confirm button, for answers that remove something. */
	readonly danger?: boolean;
}
