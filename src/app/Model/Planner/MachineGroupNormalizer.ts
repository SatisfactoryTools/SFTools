import {Injectable} from '@angular/core';
import {Building} from '@src/Model/Data/Entities/Building';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';

@Injectable({providedIn: 'root'})
export class MachineGroupNormalizer
{

	/** Rounds UP so a normalized group never produces less than the fraction it replaces. */
	public roundClock(value: number): number
	{
		return Math.min(250, Math.max(1, Math.ceil(value * 10000 - 1e-7) / 10000));
	}

	public clampSloops(sloops: number, machine: Building): number
	{
		return Math.max(0, Math.min(machine.sloopSlots, Math.round(sloops)));
	}

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

	public generateForTarget(target: number, clockSpeed: number, sloops: number, mode: GroupingMode): MachineGroup[]
	{
		// Same rounded clock on both sides, or the division and the groups' own rounding could leave the capacity a hair short.
		const clock = this.roundClock(clockSpeed);
		return this.generate(target * 100 / clock, clock, sloops, mode);
	}

	/** Bucketed by sloop count so the node's boost (and with it the input/output ratio) is preserved instead of mixed sloops being reset. */
	public recalculated(groups: MachineGroup[], target: number, mode: GroupingMode, clockSpeed: number = 100): MachineGroup[]
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
			return this.generateForTarget(target, clockSpeed, groups[0]?.sloops ?? 0, mode);
		}
		return [...buckets.entries()].flatMap(([sloops, capacity]) =>
			this.generateForTarget(target * capacity / totalCapacity, clockSpeed, sloops, mode));
	}

	/** 1e-9 is the solver's snap grid: smaller remainders are dust. */
	private wholeMachines(amount: number): number
	{
		return Math.max(1, Math.ceil(amount - 1e-9));
	}

	/** A remainder below the 1% minimum clock folds into the whole group's clock, else becomes a lone 1% machine; only sub-1e-9 dust is dropped, since the capacity warning compares near-exactly. */
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
