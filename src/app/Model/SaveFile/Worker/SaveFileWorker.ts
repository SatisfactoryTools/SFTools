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

/**
 * Only the unlock class names cross back to the main thread - structured-
 * cloning the full parsed save (easily hundreds of MB as an object graph)
 * would defeat the point of parsing in a worker.
 */
function extractUnlocks(save: SatisfactorySave): SaveFileUnlocks
{
	const objects = Object.values(save.levels).flatMap(level => level.objects);
	const schematics = readReferencedClassNames(objects, ['.BP_SchematicManager_C'], 'mPurchasedSchematics');
	// Current saves store the recipe manager as the native FGRecipeManager
	// class; older ones used a BP_RecipeManager_C blueprint - accept both.
	const recipes = readReferencedClassNames(objects, ['.FGRecipeManager', '.BP_RecipeManager_C'], 'mAvailableRecipes');

	if (schematics === null && recipes === null) {
		throw new Error('No unlock progression was found in this file - it does not look like a Satisfactory save.');
	}

	return {
		sessionName: save.header.sessionName || null,
		schematics: schematics ?? [],
		recipes: recipes ?? [],
	};
}

/**
 * Reads an object-reference array property off the save's manager object with
 * the given class suffix and returns the bare class names (the part after the
 * last dot of each reference path). Null when the manager itself is missing;
 * an empty array when it exists but holds no such property (fresh save).
 */
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
		// Cosmetic unlocks (color swatches, building skins) are recipes too,
		// but no dataset carries them - dropping them here keeps them from
		// being reported as unknown-to-the-dataset entries downstream.
		.filter(pathName => !pathName.includes('/Customization/'))
		.map(pathName => pathName.slice(pathName.lastIndexOf('.') + 1))
		.filter(className => className.length > 0);
}

function parseErrorMessage(e: unknown): string
{
	if (e instanceof UnsupportedVersionError) {
		return 'This save was created with an unsupported game version - only saves from Update 6 or newer can be read.';
	}
	// Malformed input makes the parser throw plain Errors carrying internal
	// byte offsets - none of them mean anything to the user.
	return 'The file could not be read - it is either corrupted or not a Satisfactory save file.';
}
