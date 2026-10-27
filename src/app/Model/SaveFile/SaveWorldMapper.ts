import {Injectable} from '@angular/core';
import {WorldNodesSchema} from '@src/Model/API/Schema/World/WorldNodesSchema';
import {WorldSettingsLabels} from '@src/Model/Data/WorldSettingsLabels';
import {SaveFileWorld} from '@src/Model/SaveFile/SaveFileWorld';
import {SaveWorldMapResult} from '@src/Model/SaveFile/SaveWorldMapResult';

@Injectable({providedIn: 'root'})
export class SaveWorldMapper
{

	public map(save: SaveFileWorld, world: WorldNodesSchema | null): SaveWorldMapResult
	{
		const settings = {seed: save.seed, mode: save.mode, purity: save.purity};
		if (world === null) {
			return {saveIdentifier: save.saveIdentifier, world: settings, sameWorld: null, takenNodes: [], unplacedNodes: 0, collected: save.collected, players: save.players};
		}

		const nodes = new Set<string>();
		const cores = new Set<string>();
		world.resourceNodes.forEach(node => nodes.add(node.name));
		world.geysers.forEach(geyser => nodes.add(geyser.name));
		for (const core of world.frackingCores) {
			cores.add(core.name);
			core.satellites.forEach(satellite => nodes.add(satellite.name));
		}

		const takenNodes: string[] = [];
		let unplacedNodes = 0;
		for (const name of save.extractedNodes) {
			if (nodes.has(name)) {
				takenNodes.push(name);
			} else if (!cores.has(name)) {
				// A pressurizer on a well's core takes nothing: its satellites are taken one by one.
				unplacedNodes++;
			}
		}

		return {
			saveIdentifier: save.saveIdentifier,
			world: settings,
			sameWorld: WorldSettingsLabels.same(settings, {seed: world.seed ?? 0, mode: world.mode ?? 'none', purity: world.puritySettings ?? 'no-change'}),
			takenNodes: takenNodes.sort(),
			unplacedNodes,
			collected: [...save.collected].sort(),
			players: save.players,
		};
	}

}
