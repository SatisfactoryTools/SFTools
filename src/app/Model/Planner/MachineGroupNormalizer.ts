import {Injectable} from '@angular/core';
import {Building} from '@src/Model/Data/Entities/Building';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';

/**
 * Converts fractional machine counts (solver output, pre-groups saved plans)
 * into explicit integer machine groups, and normalizes user-entered values.
 */
@Injectable({providedIn: 'root'})
export class MachineGroupNormalizer
{

	/**
	 * Clamps to the game's 1–250% range and rounds up to 4 decimal digits, so
	 * a normalized group never produces less than the fraction it replaces.
	 */
	public roundClock(value: number): number
	{
		return Math.min(250, Math.max(1, Math.ceil(value * 10000 - 1e-7) / 10000));
	}

	public clampSloops(sloops: number, machine: Building): number
	{
		return Math.max(0, Math.min(machine.sloopSlots, Math.round(sloops)));
	}

	/**
	 * Turns a fractional machine count at one clock speed into integer groups
	 * arranged per the grouping mode, all with the given sloop count. Every
	 * mode rounds machine counts (and, for underclock-last, the last clock) UP,
	 * so the groups' capacity never undershoots the amount.
	 */
	public generate(amount: number, clockSpeed: number, sloops: number, mode: GroupingMode): MachineGroup[]
	{
		switch (mode) {
			case 'underclock-last':
				return this.fromFractionalAmount(amount, clockSpeed, sloops);
			case 'clock-equally': {
				const machines = this.wholeMachines(amount);
				return [{machines, clockSpeed: this.roundClock(amount * clockSpeed / machines), sloops}];
			}
			case 'no-clocking':
				return [{machines: this.wholeMachines(amount), clockSpeed: this.roundClock(clockSpeed), sloops}];
		}
	}

	/**
	 * Regenerates machine groups for a target (machine-equivalents at 100%)
	 * while keeping the somersloop distribution: groups are bucketed by sloop
	 * count, each bucket keeps its share of the capacity and is arranged
	 * separately, so the node's boost - and with it the input/output ratio -
	 * is preserved instead of mixed sloops being reset.
	 */
	public recalculated(groups: MachineGroup[], target: number, mode: GroupingMode): MachineGroup[]
	{
		const buckets = new Map<number, number>();
		groups.forEach(group => {
			const capacity = group.machines * (group.clockSpeed / 100);
			if (capacity > 0) {
				buckets.set(group.sloops, (buckets.get(group.sloops) ?? 0) + capacity);
			}
		});
		const totalCapacity = [...buckets.values()].reduce((sum, capacity) => sum + capacity, 0);
		if (totalCapacity <= 0) {
			return this.generate(target, 100, groups[0]?.sloops ?? 0, mode);
		}
		return [...buckets.entries()].flatMap(([sloops, capacity]) =>
			this.generate(target * capacity / totalCapacity, 100, sloops, mode));
	}

	/** Machines needed to cover the amount whole, ignoring sub-snap-grid dust; never less than one. */
	private wholeMachines(amount: number): number
	{
		return Math.max(1, Math.ceil(amount - 1e-9));
	}

	/**
	 * Turns a fractional machine count at one clock speed into integer groups:
	 * 5.4 @ 100% becomes 5 @ 100% plus 1 @ 40%. A remainder too small for the
	 * minimum 1% clock is folded into the whole group's clock speed when
	 * possible, otherwise clamped to a lone machine at 1%. Only remainders
	 * below the solver's 1e-9 snap grid are dropped as dust - anything real
	 * folds in, so the groups' capacity never undershoots the amount (the
	 * capacity warning compares near-exactly).
	 */
	public fromFractionalAmount(amount: number, clockSpeed: number, sloops: number): MachineGroup[]
	{
		const whole = Math.floor(amount + 1e-9);
		const remainder = amount - whole;

		if (remainder <= 1e-9) {
			return [{machines: Math.max(whole, 1), clockSpeed: this.roundClock(clockSpeed), sloops}];
		}

		const remainderClock = remainder * clockSpeed;
		if (remainderClock >= 1) {
			const groups: MachineGroup[] = [];
			if (whole > 0) {
				groups.push({machines: whole, clockSpeed: this.roundClock(clockSpeed), sloops});
			}
			groups.push({machines: 1, clockSpeed: this.roundClock(remainderClock), sloops});
			return groups;
		}

		if (whole >= 1) {
			const folded = amount * clockSpeed / whole;
			if (folded <= 250) {
				return [{machines: whole, clockSpeed: this.roundClock(folded), sloops}];
			}
		}

		const groups: MachineGroup[] = [];
		if (whole > 0) {
			groups.push({machines: whole, clockSpeed: this.roundClock(clockSpeed), sloops});
		}
		groups.push({machines: 1, clockSpeed: 1, sloops});
		return groups;
	}

}
