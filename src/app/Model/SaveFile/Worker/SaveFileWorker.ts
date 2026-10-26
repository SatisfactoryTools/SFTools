/// <reference lib="webworker" />
import {Parser, UnsupportedVersionError, isArrayProperty, isEnumProperty, isIntProperty} from '@etothepii/satisfactory-file-parser';
import type {ObjectReference, SatisfactorySave, SaveComponent, SaveEntity} from '@etothepii/satisfactory-file-parser';
import type {WorldDataMode} from '@src/Model/API/Schema/World/WorldDataMode';
import type {WorldDataPurity} from '@src/Model/API/Schema/World/WorldDataPurity';
import type {SaveFileUnlocks} from '@src/Model/SaveFile/SaveFileUnlocks';
import type {SaveFileWorld} from '@src/Model/SaveFile/SaveFileWorld';
import type {SaveFileWorkerRequest} from './SaveFileWorkerRequest';
import type {SaveFileWorkerResponse} from './SaveFileWorkerResponse';

addEventListener('message', ({data}: MessageEvent<SaveFileWorkerRequest>) => {
	let save: SatisfactorySave;
	try {
		save = Parser.ParseSave(data.fileName, data.buffer);
	} catch (e) {
		postMessage({unlocks: null, error: parseErrorMessage(e)} satisfies SaveFileWorkerResponse);
		return;
	}

	try {
		postMessage({unlocks: extractUnlocks(save), error: null} satisfies SaveFileWorkerResponse);
	} catch (e) {
		postMessage({unlocks: null, error: e instanceof Error ? e.message : String(e)} satisfies SaveFileWorkerResponse);
	}
});

/** Only the class names cross back to the main thread: structured-cloning the parsed save (hundreds of MB) would defeat the worker. */
function extractUnlocks(save: SatisfactorySave): SaveFileUnlocks
{
	const objects = Object.values(save.levels).flatMap(level => level.objects);
	const schematics = readReferencedClassNames(objects, ['.BP_SchematicManager_C'], 'mPurchasedSchematics');
	// Current saves use the native FGRecipeManager class, older ones a BP_RecipeManager_C blueprint.
	const recipes = readReferencedClassNames(objects, ['.FGRecipeManager', '.BP_RecipeManager_C'], 'mAvailableRecipes');

	if (schematics === null && recipes === null) {
		throw new Error('No unlock progress was found in this file. It does not look like a Satisfactory save.');
	}

	return {
		sessionName: save.header.sessionName || null,
		schematics: schematics ?? [],
		recipes: recipes ?? [],
		world: readWorld(objects),
	};
}

const WORLD_MODES: readonly WorldDataMode[] = ['none', 'random', 'basic-rich', 'advanced-rich', 'fossil-fuel-rich'];
const WORLD_PURITIES: readonly WorldDataPurity[] = ['no-change', 'all-impure', 'decrease', 'all-normal', 'increase', 'all-pure', 'all-random'];

/** Unreal skips properties left at their default, so a missing one means vanilla (no randomization, seed 0). Unknown settings give null rather than failing the unlocks. */
function readWorld(objects: (SaveEntity | SaveComponent)[]): SaveFileWorld | null
{
	const state = objects.find(object => object.typePath.endsWith('.BP_GameState_C'));
	if (!state) {
		return null;
	}
	const seed = state.properties['mNodeRandomizationSeed'];
	const mode = readWorldEnum(state.properties['mNodeRandomization'], WORLD_MODES);
	const purity = readWorldEnum(state.properties['mNodePuritySettings'], WORLD_PURITIES);
	if (mode === null || purity === null) {
		return null;
	}
	return {seed: isIntProperty(seed) ? seed.value : 0, mode, purity};
}

/** ENodeRandomizationMode::NRM_AdvancedRich -> advanced-rich; the API's values are the game's names in kebab case. */
function readWorldEnum<T extends string>(property: unknown, values: readonly T[]): T | null
{
	if (property === undefined) {
		return values[0];
	}
	const name = isEnumProperty(property) ? property.value.value : '';
	const value = name.replace(/^.*::[A-Z]+_/, '').replace(/(?<=[a-z])(?=[A-Z])/g, '-').toLowerCase();
	return (values as readonly string[]).includes(value) ? value as T : null;
}

function readReferencedClassNames(objects: (SaveEntity | SaveComponent)[], typePathSuffixes: string[], propertyName: string): string[] | null
{
	const manager = objects.find(object => typePathSuffixes.some(suffix => object.typePath.endsWith(suffix)));
	if (!manager) {
		return null;
	}

	const property = manager.properties[propertyName];
	if (property === undefined || Array.isArray(property) || !isArrayProperty(property)) {
		return [];
	}

	return (property.values as ObjectReference[])
		.map(reference => reference?.pathName ?? '')
		// Cosmetic unlocks (swatches, skins) are recipes too, but no dataset carries them; dropped here so they are not reported as unknown.
		.filter(pathName => !pathName.includes('/Customization/'))
		.map(pathName => pathName.slice(pathName.lastIndexOf('.') + 1))
		.filter(className => className.length > 0);
}

function parseErrorMessage(e: unknown): string
{
	if (e instanceof UnsupportedVersionError) {
		return 'This save comes from a game version that is not supported. Only saves from Update 6 or newer can be read.';
	}
	// The parser's own Errors carry internal byte offsets that mean nothing to the user.
	return 'The file could not be read. It is either damaged or not a Satisfactory save file.';
}
