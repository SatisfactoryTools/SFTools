import {Injectable} from '@angular/core';
import {ModEntryDescriptor} from '@src/Model/ModEditor/ModEntryDescriptor';
import {ModFieldDescriptor} from '@src/Model/ModEditor/ModFieldDescriptor';
import {ModSchemaDescriptors} from '@src/Model/ModEditor/ModSchemaDescriptors';

/** Reporting stops here - a systematically broken paste would otherwise produce thousands of lines. */
const MAX_ERRORS = 50;

/**
 * Structural validation of pasted mod data against the Data schema, driven
 * by the same field descriptors the forms use. Collections may be omitted
 * (a mod rarely touches all of them), but every entry present must be
 * complete and carry only known fields - the API overwrites whole entries
 * by className, so partial entries would wipe fields on the server.
 */
@Injectable({providedIn: 'root'})
export class ModDataValidator
{

	/** Returns the list of problems; an empty list means the value fits the schema. */
	public validate(value: unknown): string[]
	{
		const errors: string[] = [];
		if (!this.isPlainObject(value)) {
			return ['The root must be a JSON object.'];
		}

		const knownCollections = new Set([...ModSchemaDescriptors.ALL.map(d => d.collection as string), 'resources']);
		Object.keys(value).forEach(key => {
			if (!knownCollections.has(key)) {
				this.push(errors, `Unknown top-level field "${key}".`);
			}
		});

		ModSchemaDescriptors.ALL.forEach(descriptor => {
			const collection = value[descriptor.collection];
			if (collection === undefined) {
				return;
			}
			if (!this.isPlainObject(collection)) {
				this.push(errors, `"${descriptor.collection}" must be an object keyed by className.`);
				return;
			}
			Object.entries(collection).forEach(([key, entry]) => this.validateEntry(descriptor, key, entry, errors));
		});

		const resources = value['resources'];
		if (resources !== undefined && (!Array.isArray(resources) || resources.some(entry => typeof entry !== 'string'))) {
			this.push(errors, '"resources" must be an array of item classNames.');
		}

		if (errors.length > MAX_ERRORS) {
			return [...errors.slice(0, MAX_ERRORS), `…and ${errors.length - MAX_ERRORS} more.`];
		}
		return errors;
	}

	private validateEntry(descriptor: ModEntryDescriptor, key: string, entry: unknown, errors: string[]): void
	{
		const path = `${descriptor.collection}.${key}`;
		if (!this.isPlainObject(entry)) {
			this.push(errors, `${path} must be an object.`);
			return;
		}

		if (entry['className'] === undefined) {
			this.push(errors, `${path}: missing "className".`);
		} else if (entry['className'] !== key) {
			this.push(errors, `${path}: "className" (${String(entry['className'])}) must match its key.`);
		}

		const known = new Set(['className', ...descriptor.fields.map(field => field.key)]);
		Object.keys(entry).forEach(fieldKey => {
			if (!known.has(fieldKey)) {
				this.push(errors, `${path}: unknown field "${fieldKey}".`);
			}
		});

		descriptor.fields.forEach(field => {
			if (entry[field.key] === undefined) {
				this.push(errors, `${path}: missing field "${field.key}".`);
			} else {
				this.validateField(field, entry[field.key], `${path}.${field.key}`, errors);
			}
		});
	}

	private validateField(field: ModFieldDescriptor, value: unknown, path: string, errors: string[]): void
	{
		if (value === null) {
			if (!field.nullable) {
				this.push(errors, `${path} must not be null.`);
			}
			return;
		}

		switch (field.kind) {
			case 'text':
			case 'multiline':
			case 'image':
				this.expect(typeof value === 'string', `${path} must be a string.`, errors);
				return;
			case 'number':
				this.expect(typeof value === 'number' && isFinite(value), `${path} must be a number.`, errors);
				return;
			case 'boolean':
				this.expect(typeof value === 'boolean', `${path} must be a boolean.`, errors);
				return;
			case 'enum':
				this.expect(
					(field.options ?? []).some(option => option.value === value),
					`${path} must be one of: ${(field.options ?? []).map(option => JSON.stringify(option.value)).join(', ')}.`,
					errors,
				);
				return;
			case 'color':
				this.validateShape(value, path, {r: 'number', g: 'number', b: 'number', a: 'number'}, errors);
				return;
			case 'stringList':
				this.expect(
					Array.isArray(value) && value.every(entry => typeof entry === 'string'),
					`${path} must be an array of strings.`,
					errors,
				);
				return;
			case 'itemAmounts':
				this.validateList(value, path, entry => this.validateShape(entry, path, {item: 'string', amount: 'number'}, errors), errors);
				return;
			case 'fuels':
				this.validateList(value, path, entry => this.validateShape(entry, path, {
					item: 'string',
					supplementalItem: 'string|null',
					byproduct: 'string|null',
					byproductAmount: 'number',
					acceptsAnySolidFuel: 'boolean',
				}, errors), errors);
				return;
			case 'json':
				this.validateJsonShape(field, value, path, errors);
				return;
		}
	}

	private validateJsonShape(field: ModFieldDescriptor, value: unknown, path: string, errors: string[]): void
	{
		switch (field.jsonShape) {
			case 'unlock':
				if (!this.validateShape(value, path, {
					recipes: 'string[]',
					schematics: 'string[]',
					items: 'array',
					scannableObjects: 'array',
					scannableResources: 'string[]',
					tapes: 'string[]',
					emotes: 'string[]',
					inventorySlots: 'number',
					equipmentSlots: 'number',
				}, errors)) {
					return;
				}
				this.validateList((value as Record<string, unknown>)['items'], `${path}.items`,
					entry => this.validateShape(entry, `${path}.items`, {item: 'string', amount: 'number'}, errors), errors);
				this.validateList((value as Record<string, unknown>)['scannableObjects'], `${path}.scannableObjects`,
					entry => this.validateShape(entry, `${path}.scannableObjects`, {object: 'string', actors: 'string[]'}, errors), errors);
				return;
			case 'dependency':
				this.validateShape(value, path, {schematics: 'string[]', gamePhase: 'string|null', requireAll: 'boolean'}, errors);
				return;
			case 'buildingMaterials':
				this.validateList(value, path, entry => this.validateShape(entry, path, {material: 'string', recipe: 'string'}, errors), errors);
				return;
			default:
				return;
		}
	}

	/** Checks the value is an object with exactly the given keys and primitive types; returns whether it passed. */
	private validateShape(value: unknown, path: string, shape: Record<string, string>, errors: string[]): boolean
	{
		if (!this.isPlainObject(value)) {
			this.push(errors, `${path} must be an object.`);
			return false;
		}
		let valid = true;
		Object.keys(value).forEach(key => {
			if (!(key in shape)) {
				this.push(errors, `${path}: unknown field "${key}".`);
				valid = false;
			}
		});
		Object.entries(shape).forEach(([key, type]) => {
			const field = value[key];
			if (field === undefined) {
				this.push(errors, `${path}: missing field "${key}".`);
				valid = false;
				return;
			}
			if (!this.matchesType(field, type)) {
				this.push(errors, `${path}.${key} must be of type ${type}.`);
				valid = false;
			}
		});
		return valid;
	}

	private matchesType(value: unknown, type: string): boolean
	{
		switch (type) {
			case 'string': return typeof value === 'string';
			case 'number': return typeof value === 'number' && isFinite(value);
			case 'boolean': return typeof value === 'boolean';
			case 'string|null': return value === null || typeof value === 'string';
			case 'string[]': return Array.isArray(value) && value.every(entry => typeof entry === 'string');
			case 'array': return Array.isArray(value);
			default: return false;
		}
	}

	private validateList(value: unknown, path: string, each: (entry: unknown) => void, errors: string[]): void
	{
		if (!Array.isArray(value)) {
			this.push(errors, `${path} must be an array.`);
			return;
		}
		value.forEach(each);
	}

	private expect(condition: boolean, message: string, errors: string[]): void
	{
		if (!condition) {
			this.push(errors, message);
		}
	}

	private push(errors: string[], message: string): void
	{
		// Collect a little past the cap so the summary line can say how many more there were.
		if (errors.length <= MAX_ERRORS * 20) {
			errors.push(message);
		}
	}

	private isPlainObject(value: unknown): value is Record<string, unknown>
	{
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}

}
