import {computed, effect, Injectable, OnDestroy, signal, Signal, untracked} from '@angular/core';
import {MapMarkerSource} from '@src/Components/Map/MapMarkerSource';
import {MapPlanSettingsService} from '@src/Components/Map/MapPlanSettingsService';
import {MapResourceAreaService} from '@src/Components/Map/MapResourceAreaService';
import {ItemForm} from '@src/Model/API/Schema/Data/Parts/ItemForm';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {GameManager} from '@src/Model/Game/GameManager';
import {WorldLimitsCalculator} from '@src/Model/Data/WorldLimitsCalculator';
import {ConveyorTiers} from '@src/Model/Map/ConveyorTiers';
import {FactorySiteExplanation} from '@src/Model/Map/FactorySite/FactorySiteExplanation';
import {FactorySiteGrid} from '@src/Model/Map/FactorySite/FactorySiteGrid';
import {FactorySiteMaskLoader} from '@src/Model/Map/FactorySite/FactorySiteMaskLoader';
import {FactorySitePainter} from '@src/Model/Map/FactorySite/FactorySitePainter';
import {FactorySiteResource} from '@src/Model/Map/FactorySite/FactorySiteResource';
import {FactorySiteResult} from '@src/Model/Map/FactorySite/FactorySiteResult';
import {FactorySiteRow} from '@src/Model/Map/FactorySite/FactorySiteRow';
import {FactorySiteScorer} from '@src/Model/Map/FactorySite/FactorySiteScorer';
import {FactorySiteStatus} from '@src/Model/Map/FactorySite/FactorySiteStatus';
import {FactorySiteWorkerRequest} from '@src/Model/Map/FactorySite/Worker/FactorySiteWorkerRequest';
import {FactorySiteWorkerResponse} from '@src/Model/Map/FactorySite/Worker/FactorySiteWorkerResponse';
import {MapAreaGeometry} from '@src/Model/Map/MapAreaGeometry';
import {MapBackgroundManager} from '@src/Model/Map/MapBackgroundManager';
import {MapMarkerBuilder} from '@src/Model/Map/MapMarkerBuilder';
import {MapPlanDefaults} from '@src/Model/Map/MapPlanDefaults';
import {MapResourceColors} from '@src/Model/Map/MapResourceColors';
import {MapTarget} from '@src/Model/Map/MapTarget';
import {FactorySiteOptions} from '@src/Model/Planner/FactorySiteOptions';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {ResourcePoolService} from '@src/Model/Planner/Pool/ResourcePoolService';

@Injectable()
export class FactorySiteService implements OnDestroy
{

	/** Cells along the longer side of the world: about 47 m each on the 7.5 km map. */
	private static readonly GRID_CELLS = 160;

	private static readonly EPSILON = 1e-6;

	public readonly options: Signal<FactorySiteOptions> = computed(() => ({
		...MapPlanDefaults.FACTORY_SITE,
		...this.planSettings.settings()?.factorySite,
	}));

	/** Why the options cannot be saved; the heatmap still shows with the saved ones. */
	public readonly blocker: Signal<string | null> = computed(() => this.planSettings.blocker());

	public readonly target: Signal<MapTarget | null> = computed(() => this.areas.target());

	/** The plan's mining, for the resources it has a limit on: unlimited ones (water, usually) can be had anywhere. */
	private readonly demand = computed<Map<string, number> | null>(() => {
		const target = this.target();
		if (target === null) {
			return null;
		}
		const usage = target.plan !== null ? this.pool.usageOfPlan(target.plan) : this.pool.usageInFolder(target.folder!.id);
		const limits = target.settings?.resourceLimits
			?? (target.folder !== null ? this.planManager.effectiveFolderSettings(target.folder.id).resourceLimits : undefined)
			?? {};
		return new Map([...usage].filter(([className, amount]) => amount > FactorySiteService.EPSILON && className in limits));
	});

	private readonly calculated = computed(() => {
		const target = this.target();
		if (target === null) {
			return false;
		}
		const plans = target.plan !== null ? [target.plan] : this.planManager.innerPlans(target.folder!.id);
		return plans.some(plan => plan.graph !== null);
	});

	public readonly areaAvailable = computed(() => this.areas.area() !== null);

	private readonly resources = computed<FactorySiteResource[] | null>(() => {
		const demand = this.demand();
		const world = this.markers.worldNodes();
		const data = this.versionManager.activeVersionData();
		if (demand === null || world === null || data === null) {
			return null;
		}
		const options = this.options();
		const area = options.areaOnly ? this.areas.area() : null;
		const conveyors = this.planSettings.conveyors();
		const beltCap = ConveyorTiers.belt(conveyors.beltMark);
		const pipeCap = ConveyorTiers.pipe(conveyors.pipeMark);
		const taken = this.games.taken();
		const nodes = new Map<string, number[]>();
		const add = (name: string, className: string, purity: string, location: [number, number, number], satellite: boolean): void => {
			if (!demand.has(className) || taken.has(name) || (area !== null && !MapAreaGeometry.contains(area.points, location[0], location[1]))) {
				return;
			}
			const solid = (data.searchItemByClassName(className)?.form ?? ItemForm.Solid) === ItemForm.Solid;
			let list = nodes.get(className);
			if (list === undefined) {
				list = [];
				nodes.set(className, list);
			}
			list.push(location[0], location[1], this.limits.nodeRate(MapMarkerBuilder.purity(purity), solid, satellite, beltCap, pipeCap));
		};
		world.resourceNodes.forEach(node => add(node.name, node.resource, node.purity, node.location, false));
		world.frackingCores.forEach(core => core.satellites.forEach(satellite => add(satellite.name, core.resource, satellite.purity, satellite.location, true)));

		return [...demand].map(([className, amount]) => {
			const fluid = (data.searchItemByClassName(className)?.form ?? ItemForm.Solid) !== ItemForm.Solid;
			return {
				className,
				demand: amount,
				factor: fluid && options.fluidCost ? options.fluidFactor : 1,
				nodes: nodes.get(className) ?? [],
			};
		});
	});

	public readonly rows = computed<FactorySiteRow[]>(() => {
		const data = this.versionManager.activeVersionData();
		return (this.resources() ?? []).map(resource => {
			const item = data?.searchItemByClassName(resource.className);
			let capacity = 0;
			for (let i = 2; i < resource.nodes.length; i += 3) {
				capacity += resource.nodes[i];
			}
			return {
				className: resource.className,
				name: item?.name ?? resource.className,
				demand: resource.demand,
				nodeCount: resource.nodes.length / 3,
				capacity,
				fluid: (item?.form ?? ItemForm.Solid) !== ItemForm.Solid,
			};
		}).sort((a, b) => a.name.localeCompare(b.name));
	});

	public readonly status = computed<FactorySiteStatus>(() => {
		if (this.target() === null) {
			return 'no-target';
		}
		if (!this.calculated()) {
			return 'not-calculated';
		}
		if ((this.demand()?.size ?? 0) === 0) {
			return 'nothing-mined';
		}
		return this.resources() === null || this.grid() === null ? 'loading' : 'ready';
	});

	private readonly grid = computed<FactorySiteGrid | null>(() => {
		const background = this.backgrounds.background();
		if (background === null) {
			return null;
		}
		const world = background.world;
		const cellSize = Math.max(world.maxX - world.minX, world.maxY - world.minY) / FactorySiteService.GRID_CELLS;
		return {
			minX: world.minX,
			minY: world.minY,
			cellSize,
			columns: Math.ceil((world.maxX - world.minX) / cellSize),
			rows: Math.ceil((world.maxY - world.minY) / cellSize),
		};
	});

	private readonly activeSignal = signal(false);

	private readonly maskSignal = signal<{key: string; mask: Uint8Array | null} | null>(null);

	private readonly resultSignal = signal<FactorySiteResult | null>(null);
	public readonly result = this.resultSignal.asReadonly();

	private readonly computingSignal = signal(false);
	public readonly computing = this.computingSignal.asReadonly();

	private readonly colors = new MapResourceColors();
	private readonly scorer = new FactorySiteScorer();
	private readonly painter = new FactorySitePainter();
	private worker: Worker | null = null;
	private requestId = 0;
	private pending: {id: number; grid: FactorySiteGrid} | null = null;

	public constructor(
		private readonly planSettings: MapPlanSettingsService,
		private readonly areas: MapResourceAreaService,
		private readonly markers: MapMarkerSource,
		private readonly backgrounds: MapBackgroundManager,
		private readonly versionManager: VersionManager,
		private readonly planManager: PlanManager,
		private readonly pool: ResourcePoolService,
		private readonly limits: WorldLimitsCalculator,
		private readonly maskLoader: FactorySiteMaskLoader,
		private readonly games: GameManager,
	)
	{
		effect(() => {
			const background = this.backgrounds.background();
			const grid = this.grid();
			if (!this.activeSignal() || background === null || grid === null) {
				return;
			}
			const key = `${background.id}|${grid.columns}x${grid.rows}`;
			if (untracked(this.maskSignal)?.key !== key) {
				void this.maskLoader.load(background, grid).then(mask => this.maskSignal.set({key, mask}));
			}
		});

		// Recomputing is a few hundred milliseconds of work: only while someone looks at the layer.
		effect(() => {
			const resources = this.resources();
			const grid = this.grid();
			const mask = this.maskSignal();
			const mode = this.options().mode;
			if (!this.activeSignal()) {
				return;
			}
			if (this.status() !== 'ready') {
				untracked(() => this.resultSignal.set(null));
				return;
			}
			if (resources === null || grid === null || mask === null) {
				return;
			}
			untracked(() => this.compute({id: ++this.requestId, grid, mask: mask.mask, resources, mode}));
		});
	}

	public setActive(active: boolean): void
	{
		this.activeSignal.set(active);
	}

	public update(changes: Partial<FactorySiteOptions>): void
	{
		const options = {...this.options(), ...changes};
		this.planSettings.update(settings => ({...settings, factorySite: options}), false);
	}

	public explain(x: number, y: number): FactorySiteExplanation | null
	{
		const resources = this.resources();
		return resources === null ? null : this.scorer.explain(x, y, resources, this.options().mode);
	}

	public color(className: string): string
	{
		return this.colors.color(className, this.versionManager.activeVersionData()?.searchItemByClassName(className));
	}

	/** Index → node position, for drawing the lines of an explanation. */
	public nodePosition(className: string, index: number): [number, number] | null
	{
		const nodes = this.resources()?.find(resource => resource.className === className)?.nodes;
		return nodes === undefined || index * 3 + 1 >= nodes.length ? null : [nodes[index * 3], nodes[index * 3 + 1]];
	}

	public ngOnDestroy(): void
	{
		this.worker?.terminate();
		this.worker = null;
	}

	private compute(request: FactorySiteWorkerRequest): void
	{
		this.pending = {id: request.id, grid: request.grid};
		this.computingSignal.set(true);
		this.worker ??= this.createWorker();
		this.worker.postMessage(request);
	}

	private createWorker(): Worker
	{
		const worker = new Worker(new URL('../../Model/Map/FactorySite/Worker/FactorySiteWorker', import.meta.url), {type: 'module'});
		worker.addEventListener('message', ({data}: MessageEvent<FactorySiteWorkerResponse>) => {
			// A later request replaces this one: options changed while it ran.
			if (this.pending === null || data.id !== this.pending.id) {
				return;
			}
			const grid = this.pending.grid;
			this.pending = null;
			this.resultSignal.set({
				grid,
				overlay: this.painter.paint(grid, data.scores),
				spots: this.painter.spots(grid, data.scores),
			});
			this.computingSignal.set(false);
		});
		worker.addEventListener('error', event => {
			console.error('[FactorySiteWorker] Worker crashed:', event.message, event);
			this.pending = null;
			this.computingSignal.set(false);
			this.worker?.terminate();
			this.worker = null;
		});
		return worker;
	}

}
