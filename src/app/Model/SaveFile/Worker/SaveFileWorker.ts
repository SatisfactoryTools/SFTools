/// <reference lib="webworker" />
import {Parser, UnsupportedVersionError, isArrayProperty} from '@etothepii/satisfactory-file-parser';
import type {ObjectReference, SatisfactorySave, SaveComponent, SaveEntity} from '@etothepii/satisfactory-file-parser';
import type {SaveFileUnlocks} from '@src/Model/SaveFile/SaveFileUnlocks';
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
	};
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
