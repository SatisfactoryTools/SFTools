import {Component, ChangeDetectionStrategy, OnDestroy, OnInit} from '@angular/core';
import {ConfirmDialogService} from '@src/Components/Common/ConfirmDialogService';
import {FocusOnInitDirective} from '@src/Components/Common/FocusOnInitDirective';
import {HotkeyBlockDirective} from '@src/Components/Common/HotkeyBlockDirective';

@Component({
	selector: 'confirm-dialog',
	templateUrl: './ConfirmDialogComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FocusOnInitDirective, HotkeyBlockDirective],
	styles: `
		.confirm-backdrop {
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 1095;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.confirm-dialog {
			width: min(460px, calc(100vw - 2rem));
		}
		.confirm-message {
			white-space: pre-line;
			overflow-wrap: anywhere;
		}
		/* Phones: a sheet along the bottom edge, in thumb reach, with buttons big enough to tap. */
		@media (max-width: 575.98px) {
			.confirm-backdrop {
				align-items: flex-end;
			}
			.confirm-dialog {
				width: 100%;
				padding-bottom: env(safe-area-inset-bottom);
			}
			.confirm-buttons {
				flex-direction: column-reverse;
			}
			.confirm-buttons .btn {
				width: 100%;
				padding-top: 0.6rem;
				padding-bottom: 0.6rem;
			}
		}
	`,
})
export class ConfirmDialogComponent implements OnInit, OnDestroy
{

	/** Capture phase on the document, so Escape answers this dialog and does not also close a dialog under it. */
	private readonly keydownListener = (event: KeyboardEvent): void => this.onKeydown(event);

	public constructor(public readonly dialog: ConfirmDialogService)
	{
	}

	public ngOnInit(): void
	{
		document.addEventListener('keydown', this.keydownListener, true);
	}

	public ngOnDestroy(): void
	{
		document.removeEventListener('keydown', this.keydownListener, true);
	}

	public answer(confirmed: boolean): void
	{
		this.dialog.answer(confirmed);
	}

	private onKeydown(event: KeyboardEvent): void
	{
		if (this.dialog.request() === null || event.key !== 'Escape') {
			return;
		}
		event.preventDefault();
		event.stopImmediatePropagation();
		this.answer(false);
	}

}
