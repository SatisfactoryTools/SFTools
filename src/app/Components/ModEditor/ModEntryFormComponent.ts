import {NgTemplateOutlet} from '@angular/common';
import {Component, ChangeDetectionStrategy, Input, OnChanges} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ModImageFieldComponent} from '@src/Components/ModEditor/ModImageFieldComponent';
import {ColorSchema} from '@src/Model/API/Schema/Data/Parts/ColorSchema';
import {FuelSchema} from '@src/Model/API/Schema/Data/Parts/FuelSchema';
import {ItemAmountSchema} from '@src/Model/API/Schema/Data/Parts/ItemAmountSchema';
import {ModEntryDescriptor} from '@src/Model/ModEditor/ModEntryDescriptor';
import {ModFieldDescriptor} from '@src/Model/ModEditor/ModFieldDescriptor';

/**
 * Metadata-driven form for one mod entry: renders every field of the entry's
 * descriptor by kind, the required ones up front and the rest behind "More
 * fields". Edits mutate the entry object in place - the editor's JSON view
 * reads the same object.
 */
@Component({
	selector: 'mod-entry-form',
	templateUrl: './ModEntryFormComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, NgTemplateOutlet, ModImageFieldComponent],
})
export class ModEntryFormComponent implements OnChanges
{

	@Input({required: true}) public entry!: Record<string, unknown>;
	@Input({required: true}) public descriptor!: ModEntryDescriptor;

	public showOptional = false;

	/**
	 * Raw text being typed into list/json fields - parsing on every keystroke
	 * would eat separators mid-typing (", " collapses when re-joined), so the
	 * field shows the draft and the entry gets the parsed value.
	 */
	private readonly drafts = new Map<string, string>();
	/** Json fields whose current draft does not parse. */
	private readonly brokenJson = new Set<string>();

	public ngOnChanges(): void
	{
		this.drafts.clear();
		this.brokenJson.clear();
		this.showOptional = false;
	}

	public get requiredFields(): ModFieldDescriptor[]
	{
		return this.descriptor.fields.filter(field => field.required);
	}

	public get optionalFields(): ModFieldDescriptor[]
	{
		return this.descriptor.fields.filter(field => !field.required);
	}

	public value(key: string): unknown
	{
		return this.entry[key];
	}

	public setValue(key: string, value: unknown): void
	{
		this.entry[key] = value;
	}

	public text(field: ModFieldDescriptor): string
	{
		return (this.value(field.key) as string | null) ?? '';
	}

	public setText(field: ModFieldDescriptor, raw: string): void
	{
		this.setValue(field.key, raw === '' && field.nullable ? null : raw);
	}

	public numberValue(field: ModFieldDescriptor): number
	{
		return (this.value(field.key) as number | null) ?? 0;
	}

	public setNumber(field: ModFieldDescriptor, raw: number | null): void
	{
		this.setValue(field.key, raw ?? 0);
	}

	public booleanValue(field: ModFieldDescriptor): boolean
	{
		return this.value(field.key) === true;
	}

	public imageValue(field: ModFieldDescriptor): string | null
	{
		return (this.value(field.key) as string | null) ?? null;
	}

	public colorOf(field: ModFieldDescriptor): ColorSchema
	{
		return this.value(field.key) as ColorSchema;
	}

	public stringListText(field: ModFieldDescriptor): string
	{
		return this.drafts.get(field.key) ?? ((this.value(field.key) as string[]) ?? []).join(', ');
	}

	public setStringListText(field: ModFieldDescriptor, raw: string): void
	{
		this.drafts.set(field.key, raw);
		this.setValue(field.key, raw.split(',').map(part => part.trim()).filter(part => part !== ''));
	}

	public itemAmounts(field: ModFieldDescriptor): ItemAmountSchema[]
	{
		return this.value(field.key) as ItemAmountSchema[];
	}

	public addItemAmount(field: ModFieldDescriptor): void
	{
		this.itemAmounts(field).push({item: '', amount: 1});
	}

	public removeItemAmount(field: ModFieldDescriptor, index: number): void
	{
		this.itemAmounts(field).splice(index, 1);
	}

	public fuels(field: ModFieldDescriptor): FuelSchema[]
	{
		return this.value(field.key) as FuelSchema[];
	}

	public addFuel(field: ModFieldDescriptor): void
	{
		this.fuels(field).push({item: '', supplementalItem: null, byproduct: null, byproductAmount: 0, acceptsAnySolidFuel: false});
	}

	public removeFuel(field: ModFieldDescriptor, index: number): void
	{
		this.fuels(field).splice(index, 1);
	}

	/** Nullable text inside fuel rows: empty input means null. */
	public setFuelNullable(fuel: FuelSchema, key: 'supplementalItem' | 'byproduct', raw: string): void
	{
		fuel[key] = raw === '' ? null : raw;
	}

	public jsonText(field: ModFieldDescriptor): string
	{
		return this.drafts.get(field.key) ?? JSON.stringify(this.value(field.key), null, '\t');
	}

	public setJsonText(field: ModFieldDescriptor, raw: string): void
	{
		this.drafts.set(field.key, raw);
		try {
			this.setValue(field.key, JSON.parse(raw));
			this.brokenJson.delete(field.key);
		} catch {
			this.brokenJson.add(field.key);
		}
	}

	public isJsonBroken(field: ModFieldDescriptor): boolean
	{
		return this.brokenJson.has(field.key);
	}

}
