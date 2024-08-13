import {Component, ChangeDetectionStrategy, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ModImageStore} from '@src/Model/ModEditor/ModImageStore';

/**
 * Icon field of a mod entry: holds an image id (a `local-…` placeholder for
 * files picked here, later a server id once uploads exist). Picking a file
 * registers it in the ModImageStore and writes its id; the id can also be
 * typed or cleared by hand.
 */
@Component({
	selector: 'mod-image-field',
	templateUrl: './ModImageFieldComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule],
})
export class ModImageFieldComponent
{

	@Input() public value: string | null = null;
	/** Whether clearing stores null (icon) or an empty string (smallIcon/bigIcon). */
	@Input() public nullable = false;
	@Output() public readonly valueChange = new EventEmitter<string | null>();

	public constructor(protected readonly imageStore: ModImageStore)
	{
	}

	public get previewUrl(): string | null
	{
		return this.imageStore.urlOf(this.value);
	}

	public onIdChange(id: string): void
	{
		this.valueChange.emit(id === '' && this.nullable ? null : id);
	}

	public onFilePicked(event: Event): void
	{
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			this.valueChange.emit(this.imageStore.add(file));
		}
		// Allow re-picking the same file later.
		input.value = '';
	}

}
