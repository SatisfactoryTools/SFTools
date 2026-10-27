import {Injectable} from '@angular/core';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {Game} from '@src/Model/Game/Game';
import {GameManager} from '@src/Model/Game/GameManager';
import {GameSaveImport} from '@src/Model/Game/GameSaveImport';
import {ResourceAreaCalculator} from '@src/Model/Map/ResourceAreaCalculator';
import {WorldNodesManager} from '@src/Model/Map/WorldNodesManager';
import {PlanManager} from '@src/Model/Planner/PlanManager';

/** Changes to the game that move plan limits: a resource area leaves out the taken nodes, so every area is counted again. */
@Injectable({providedIn: 'root'})
export class GameEditor
{

	public constructor(
		private readonly games: GameManager,
		private readonly planManager: PlanManager,
		private readonly worldNodes: WorldNodesManager,
		private readonly versionManager: VersionManager,
		private readonly calculator: ResourceAreaCalculator,
	)
	{
	}

	public importSave(save: GameSaveImport, into: Game | null, mode: 'update' | 'replace'): Game | null
	{
		const game = this.games.importSave(save, into, mode);
		this.recountAreas();
		return game;
	}

	public setTaken(name: string, taken: boolean): void
	{
		this.games.setTaken(name, taken);
		this.recountAreas();
	}

	public select(id: string): void
	{
		this.games.select(id);
		this.recountAreas();
	}

	public remove(id: string): void
	{
		this.games.remove(id);
		this.recountAreas();
	}

	/** Plans under a folder that fixes the resources get the folder's limits pushed down instead. Shared and device-only plans are read-only. */
	public recountAreas(): void
	{
		const world = this.worldNodes.nodes();
		const data = this.versionManager.activeVersionData();
		if (world === null || data === null) {
			return;
		}
		const taken = this.games.taken();
		for (const folder of this.planManager.folders()) {
			if (folder.settings?.resourceArea === undefined) {
				continue;
			}
			const updated = this.calculator.recount(folder.settings, world, data, taken);
			if (JSON.stringify(updated) !== JSON.stringify(folder.settings)) {
				this.planManager.setFolderSettings(folder.id, updated);
			}
		}
		const changed: string[] = [];
		for (const plan of this.planManager.plans()) {
			if (plan.settings.resourceArea === undefined || this.planManager.isReadOnlyPlan(plan.id)
				|| this.planManager.fixedGroupsOf(plan).includes('resources')) {
				continue;
			}
			const updated = this.calculator.recount(plan.settings, world, data, taken);
			if (JSON.stringify(updated) === JSON.stringify(plan.settings)) {
				continue;
			}
			this.planManager.setSettings(plan.id, updated);
			if (plan.graph !== null) {
				changed.push(plan.id);
			}
		}
		if (changed.length > 0) {
			this.planManager.setRecalculationNeeded(changed, true);
		}
	}

}
