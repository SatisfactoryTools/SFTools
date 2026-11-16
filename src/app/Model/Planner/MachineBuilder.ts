import {Injectable} from '@angular/core';
import {Building} from '@src/Model/Data/Entities/Building';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {Formulas} from '@src/Model/Planner/Formulas';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {MachineBuild} from '@src/Model/Planner/MachineBuild';
import {MachineBuildRest} from '@src/Model/Planner/MachineBuildRest';
import {MachineGroupNormalizer} from '@src/Model/Planner/MachineGroupNormalizer';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';

/** Turns a node's MachineBuild into machine groups; every recipe node outside the advanced table is built here. */
@Injectable({providedIn: 'root'})
export class MachineBuilder
{

	public constructor(private readonly normalizer: MachineGroupNormalizer)
	{
	}

	public automatic(mode: GroupingMode, clockSpeed: number, pinned: MachineGroup[] = []): MachineBuild
	{
		return {pinned, rest: {mode, clockSpeed: Formulas.clampClock(clockSpeed), machines: null}, custom: false};
	}

	public node(id: string, target: number, build: MachineBuild, machine: Building, recipe: Recipe): RecipeNode
	{
		const fitted: MachineBuild = {
			...build,
			pinned: build.pinned.map(group => this.fittedGroup(group, machine)),
			rest: {...build.rest, sloops: this.normalizer.clampSloops(build.rest.sloops ?? 0, machine)},
			...(build.manualRest ? {manualRest: build.manualRest.map(group => this.fittedGroup(group, machine))} : {}),
		};
		const node = new RecipeNode(id, target, this.groups(fitted, target), machine, recipe);
		node.build = fitted;
		return node;
	}

	public groups(build: MachineBuild, target: number): MachineGroup[]
	{
		if (build.custom) {
			const groups = this.customGroups(build);
			return groups.length > 0 ? groups : this.restGroups(build.rest, target);
		}
		return this.combined([...build.pinned, ...this.restGroups(build.rest, this.restTarget(build, target))]);
	}

	/** What the rest has to cover; zero when the pinned rows already reach the target. */
	public restTarget(build: MachineBuild, target: number): number
	{
		const remaining = target - Formulas.groupCapacity(build.pinned);
		const needsRest = build.pinned.length === 0 || remaining > Math.max(1e-9, 1e-10 * target);
		return needsRest ? Math.max(0, remaining) : 0;
	}

	public restGroups(rest: MachineBuildRest, target: number): MachineGroup[]
	{
		if (target <= 0) {
			return [];
		}
		return rest.machines === null
			? this.normalizer.generateForTarget(target, rest.clockSpeed, rest.sloops ?? 0, rest.mode)
			: this.normalizer.generateForCount(target, rest.machines, rest.sloops ?? 0, rest.mode);
	}

	public pinnedExceedTarget(build: MachineBuild, target: number): boolean
	{
		return !build.custom && build.pinned.length > 0 && RecipeNode.isCapacityShort(Formulas.groupCapacity(build.pinned), target)
			&& !this.isFitted(build, target);
	}

	/**
	 * The target for a given boosted output (in reference cycles): pinned rows keep their boost, the rest covers
	 * the difference at its own boost. Pinned rows that overshoot on their own throttle down with their mix of boosts.
	 */
	public targetForOutput(build: MachineBuild, output: number, machine: Building): number
	{
		if (build.custom) {
			return output / Formulas.outputBoostRatio(machine, this.customGroups(build));
		}
		const restBoost = this.restBoost(build, machine);
		const pinnedCapacity = Formulas.groupCapacity(build.pinned);
		const pinnedOutput = pinnedCapacity * Formulas.outputBoostRatio(machine, build.pinned);
		if (build.pinned.length === 0 || output >= pinnedOutput) {
			return (output - pinnedOutput) / restBoost + pinnedCapacity;
		}
		return output / Formulas.outputBoostRatio(machine, build.pinned);
	}

	/** The inverse of targetForOutput. */
	public outputForTarget(build: MachineBuild, target: number, machine: Building): number
	{
		if (build.custom) {
			return target * Formulas.outputBoostRatio(machine, this.customGroups(build));
		}
		const pinnedCapacity = Formulas.groupCapacity(build.pinned);
		const ratio = Formulas.outputBoostRatio(machine, build.pinned);
		return build.pinned.length === 0 || target >= pinnedCapacity
			? (target - pinnedCapacity) * this.restBoost(build, machine) + pinnedCapacity * ratio
			: target * ratio;
	}

	private restBoost(build: MachineBuild, machine: Building): number
	{
		return Formulas.sloopOutputMultiplier(machine, build.rest.sloops ?? 0);
	}

	/** Pinned rows keep their machines and sloops; when they alone overshoot the target, their clocks come down evenly. */
	public fitted(build: MachineBuild, target: number): MachineBuild
	{
		const automatic: MachineBuild = build.custom ? {pinned: build.pinned, rest: build.rest, custom: false} : build;
		const capacity = Formulas.groupCapacity(automatic.pinned);
		if (capacity <= 0 || !RecipeNode.isCapacityShort(capacity, target)) {
			return automatic;
		}
		const factor = target / capacity;
		return {
			...automatic,
			pinned: automatic.pinned.map(group => ({...group, clockSpeed: this.normalizer.roundClock(group.clockSpeed * factor)})),
		};
	}

	/** Proportional copies (blueprint ×N, node splits): every row scales like a capacity bucket at its own clock and sloops. */
	public scaled(build: MachineBuild, factor: number): MachineBuild
	{
		const pinned = build.pinned.flatMap(group =>
			this.normalizer.fromFractionalAmount(group.machines * factor, group.clockSpeed, group.sloops));
		const machines = build.rest.machines === null ? null : Math.max(1, Math.ceil(build.rest.machines * factor - 1e-9));
		const manualRest = build.manualRest?.flatMap(group =>
			this.normalizer.fromFractionalAmount(group.machines * factor, group.clockSpeed, group.sloops));
		return {
			...build,
			pinned: this.combined(pinned),
			rest: {...build.rest, machines},
			...(manualRest ? {manualRest: this.combined(manualRest)} : {}),
		};
	}

	/** Hand-made builds stay hand-made: one custom node makes the merge custom, with every node's machines kept. */
	public merged(nodes: RecipeNode[]): MachineBuild
	{
		const first = nodes[0];
		if (nodes.some(node => node.build.custom)) {
			return {pinned: this.refolded(nodes.flatMap(node => node.groups)), rest: first.build.rest, custom: true};
		}
		const counts = nodes.map(node => node.build.rest.machines);
		const machines = counts.every(count => count !== null)
			? counts.reduce((sum: number, count) => sum + (count ?? 0), 0)
			: null;
		return {
			pinned: this.refolded(nodes.flatMap(node => node.build.pinned)),
			rest: {...first.build.rest, machines},
			custom: false,
		};
	}

	/**
	 * Nodes saved before builds existed: groups their own mode would generate become an automatic build,
	 * anything else is kept exactly - as pinned rows, or as a custom build when it falls short of the target.
	 */
	public fromLegacy(groups: MachineGroup[], target: number, mode: GroupingMode): MachineBuild
	{
		const clockSpeed = groups.reduce((max, group) => Math.max(max, group.clockSpeed), 0) || 100;
		const automatic = this.automatic(mode, clockSpeed);
		if (this.sameGroups(this.combined(groups), this.groups(automatic, target))) {
			return automatic;
		}
		if (RecipeNode.isCapacityShort(target, Formulas.groupCapacity(groups))) {
			return {...automatic, pinned: groups, custom: true};
		}
		return {...automatic, pinned: groups};
	}

	public customGroups(build: MachineBuild): MachineGroup[]
	{
		return [...build.pinned, ...(build.manualRest ?? [])];
	}

	public combined(groups: MachineGroup[]): MachineGroup[]
	{
		const combined: MachineGroup[] = [];
		groups.forEach(group => {
			const index = combined.findIndex(entry => entry.clockSpeed === group.clockSpeed && entry.sloops === group.sloops);
			if (index === -1) {
				combined.push({...group});
			} else {
				combined[index] = {...combined[index], machines: combined[index].machines + group.machines};
			}
		});
		return combined;
	}

	/** Split copies each carry a slow remainder machine; merged back they fold into the original machines when that needs fewer of them. */
	private refolded(groups: MachineGroup[]): MachineGroup[]
	{
		const bySloops = new Map<number, MachineGroup[]>();
		groups.forEach(group => bySloops.set(group.sloops, [...(bySloops.get(group.sloops) ?? []), group]));
		return [...bySloops.entries()].flatMap(([sloops, rows]) => {
			const kept = this.combined(rows);
			const clock = Math.max(...rows.map(group => group.clockSpeed));
			const folded = this.normalizer.fromFractionalAmount(Formulas.groupCapacity(rows) * 100 / clock, clock, sloops);
			return this.machineCount(folded) < this.machineCount(kept) ? folded : kept;
		});
	}

	private machineCount(groups: MachineGroup[]): number
	{
		return groups.reduce((sum, group) => sum + group.machines, 0);
	}

	public sameGroups(a: MachineGroup[], b: MachineGroup[]): boolean
	{
		return a.length === b.length && a.every((group, index) =>
			group.machines === b[index].machines
			&& Math.abs(group.clockSpeed - b[index].clockSpeed) < 1e-6
			&& group.sloops === b[index].sloops);
	}

	private isFitted(build: MachineBuild, target: number): boolean
	{
		return this.sameGroups(build.pinned, this.fitted(build, target).pinned);
	}

	private fittedGroup(group: MachineGroup, machine: Building): MachineGroup
	{
		const sloops = this.normalizer.clampSloops(group.sloops, machine);
		return sloops === group.sloops ? group : {...group, sloops};
	}

}
