import {Component, ChangeDetectionStrategy, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ModImageStore} from '@src/Model/ModEditor/ModImageStore';

@Component({
	selector: 'mod-image-field',
	templateUrl: './ModImageFieldComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule],
})
export class ModImageFieldComponent
{

	@Input() public value: string | null = null;
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
