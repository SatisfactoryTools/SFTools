/// <reference lib="webworker" />
import {
	Parser, UnsupportedVersionError, isArrayProperty, isByteProperty, isEnumProperty, isIntProperty, isObjectProperty, isSaveEntity, isStrProperty,
	isStructArrayPRoperty, isStructProperty,
} from '@etothepii/satisfactory-file-parser';
import type {
	AbstractBaseProperty, DynamicStructPropertyValue, FPlayerInfoHandle, ObjectReference, PropertiesMap, SatisfactorySave, SaveComponent, SaveEntity, vec3,
} from '@etothepii/satisfactory-file-parser';
import type {WorldDataMode} from '@src/Model/API/Schema/World/WorldDataMode';
import type {WorldDataPurity} from '@src/Model/API/Schema/World/WorldDataPurity';
import type {GamePlayer} from '@src/Model/Game/GamePlayer';
import type {SaveFileUnlocks} from '@src/Model/SaveFile/SaveFileUnlocks';
import type {SaveFileWorld} from '@src/Model/SaveFile/SaveFileWorld';
import type {SaveFileWorkerRequest} from './SaveFileWorkerRequest';
import type {SaveFileWorkerResponse} from './SaveFileWorkerResponse';

addEventListener('message', ({data}: MessageEvent<SaveFileWorkerRequest>) => {
	let save: SatisfactorySave;
	try {
		save = Parser.ParseSave(data.fileName, data.buffer);
	} catch (e) {
		postMessage({contents: null, error: parseErrorMessage(e)} satisfies SaveFileWorkerResponse);
		return;
	}

	try {
		const objects = Object.values(save.levels).flatMap(level => level.objects);
		postMessage({contents: {unlocks: extractUnlocks(save, objects), world: extractWorld(save, objects)}, error: null} satisfies SaveFileWorkerResponse);
	} catch (e) {
		postMessage({contents: null, error: e instanceof Error ? e.message : String(e)} satisfies SaveFileWorkerResponse);
	}
});

/** Only names and numbers cross back to the main thread: structured-cloning the parsed save (hundreds of MB) would defeat the worker. */
function extractUnlocks(save: SatisfactorySave, objects: (SaveEntity | SaveComponent)[]): SaveFileUnlocks
{
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

// The game's names (BasicReach - sic) without their prefix, lowercased.
const MODES: Record<string, WorldDataMode> = {
	none: 'none',
	strict: 'random',
	basicreach: 'basic-rich',
	basicrich: 'basic-rich',
	advancedrich: 'advanced-rich',
	fossilfuelrich: 'fossil-fuel-rich',
};

const PURITIES: Record<string, WorldDataPurity> = {
	nochange: 'no-change',
	allimpure: 'all-impure',
	decrease: 'decrease',
	allnormal: 'all-normal',
	increase: 'increase',
	allpure: 'all-pure',
	allrandom: 'all-random',
};

function extractWorld(save: SatisfactorySave, objects: (SaveEntity | SaveComponent)[]): SaveFileWorld
{
	const gameState = objects.find(object => object.typePath.endsWith('.BP_GameState_C'))?.properties;

	const extractedNodes = new Set<string>();
	for (const object of objects) {
		const name = referenceName(property(object.properties, 'mExtractableResource', isObjectProperty)?.value.pathName ?? '');
		// Water extractors stand on a lake, not on a node.
		if (name !== '' && !name.startsWith('FGWaterVolume')) {
			extractedNodes.add(name);
		}
	}

	// The game leaves out settings at their default, and saves from before 1.2 have none of them.
	return {
		saveIdentifier: save.header.saveIdentifier || null,
		seed: property(gameState, 'mNodeRandomizationSeed', isIntProperty)?.value ?? 0,
		mode: enumValue(gameState, 'mNodeRandomization', MODES, 'none'),
		purity: enumValue(gameState, 'mNodePuritySettings', PURITIES, 'no-change'),
		extractedNodes: [...extractedNodes],
		collected: extractCollected(save),
		players: extractPlayers(objects, gameState),
	};
}

// The same list also holds wrecks, spore flowers and cut foliage, which the map does not show.
const COLLECTIBLE_PREFIXES = ['BP_WAT', 'BP_Crystal', 'BP_DropPod', 'FGItemPickup', 'BP_BerryBush', 'BP_NutBush', 'BP_Shroom'];

/** Picked-up actors are listed per level; a looted drop pod is destroyed instead. */
function extractCollected(save: SatisfactorySave): string[]
{
	const names = new Set<string>();
	for (const level of Object.values(save.levels)) {
		const references = [...level.collectables ?? [], ...Object.values(level.destroyedActorsMap ?? {}).flat()];
		for (const reference of references) {
			const name = referenceName(reference?.pathName ?? '');
			if (COLLECTIBLE_PREFIXES.some(prefix => name.startsWith(prefix))) {
				names.add(name);
			}
		}
	}
	return [...names];
}

function enumValue<T>(properties: PropertiesMap | undefined, name: string, values: Record<string, T>, fallback: T): T | null
{
	const raw = property(properties, name, isEnumProperty)?.value.value ?? property(properties, name, isByteProperty)?.value.value;
	if (typeof raw !== 'string') {
		return fallback;
	}
	const key = raw.slice(raw.lastIndexOf(':') + 1).replace(/^[A-Z]+_/, '').toLowerCase();
	return values[key] ?? null;
}

function extractPlayers(objects: (SaveEntity | SaveComponent)[], gameState: PropertiesMap | undefined): GamePlayer[]
{
	const names = (property(gameState, 'mPlayerInfoCache', isStructArrayPRoperty)?.values ?? []).map(entry => {
		const platform = property(structProperties(entry), 'PerPlatformInfo', isStructArrayPRoperty)?.values[0];
		return property(structProperties(platform), 'PlayerName', isStrProperty)?.value || null;
	});
	const pawns = new Map<string, SaveEntity>();
	for (const object of objects) {
		if (isSaveEntity(object) && object.typePath.endsWith('.Char_Player_C')) {
			pawns.set(object.instanceName, object);
		}
	}

	const players: GamePlayer[] = [];
	for (const state of objects.filter(object => object.typePath.endsWith('.BP_PlayerState_C'))) {
		// The character is where the player stood; the last safe spot is all a save without it has.
		const location = pawns.get(property(state.properties, 'mOwnedPawn', isObjectProperty)?.value.pathName ?? '')?.transform.translation
			?? property(state.properties, 'mLastSafeCharacterLocation', isStructProperty)?.value as vec3 | undefined;
		if (location === undefined || typeof location.x !== 'number') {
			continue;
		}
		const handle = property(state.properties, 'mPlatformPlayerInfoHandle', isStructProperty)?.value as FPlayerInfoHandle | undefined;
		players.push({
			name: names[handle?.playerInfoTableIndex ?? -1] ?? null,
			location: [Math.round(location.x), Math.round(location.y), Math.round(location.z)],
		});
	}
	return players;
}

/** The parser's type guards fail on a missing property: every read goes through here. */
function property<T extends AbstractBaseProperty>(
	properties: PropertiesMap | undefined,
	name: string,
	guard: (value: AbstractBaseProperty) => value is T,
): T | undefined
{
	const value = properties?.[name];
	const single = Array.isArray(value) ? value[0] : value;
	return single !== undefined && guard(single) ? single : undefined;
}

function structProperties(value: unknown): PropertiesMap | undefined
{
	return (value as DynamicStructPropertyValue | undefined)?.properties;
}

function referenceName(pathName: string): string
{
	return pathName.slice(pathName.lastIndexOf('.') + 1);
}

function parseErrorMessage(e: unknown): string
{
	if (e instanceof UnsupportedVersionError) {
		return 'This save comes from a game version that is not supported. Only saves from Update 6 or newer can be read.';
	}
	// The parser's own Errors carry internal byte offsets that mean nothing to the user.
	return 'The file could not be read. It is either damaged or not a Satisfactory save file.';
}
