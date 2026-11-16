import {Injectable} from '@angular/core';
import {Building} from '@src/Model/Data/Entities/Building';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';

const MAX_CLOCK = 250;

@Injectable({providedIn: 'root'})
export class MachineGroupNormalizer
{

	/** Rounds UP so a normalized group never produces less than the fraction it replaces. */
	public roundClock(value: number): number
	{
		return Math.min(MAX_CLOCK, Math.max(1, Math.ceil(value * 10000 - 1e-7) / 10000));
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
			case 'overclock-last':
				return this.overclockLast(amount, clockSpeed, sloops);
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

	/**
	 * A fixed machine count leaves only the clocks to work out. The mode says where the uneven part goes:
	 * whole-percent clocks with the last machine slower or faster, one exact clock for all, or whole percents that overshoot a little.
	 */
	public generateForCount(target: number, machines: number, sloops: number, mode: GroupingMode): MachineGroup[]
	{
		const count = Math.max(1, Math.round(machines));
		const total = target * 100;
		const exact = this.roundClock(total / count);
		const isWhole = Math.abs(exact - Math.round(exact)) < 1e-9;
		if (count === 1 || mode === 'clock-equally' || isWhole || exact <= 1 || exact >= MAX_CLOCK) {
			return [{machines: count, clockSpeed: exact, sloops}];
		}
		switch (mode) {
			case 'no-clocking':
				return [{machines: count, clockSpeed: Math.ceil(exact), sloops}];
			case 'underclock-last': {
				const main = Math.ceil(exact);
				const last = total - (count - 1) * main;
				return last < 1
					? [{machines: count, clockSpeed: exact, sloops}]
					: [{machines: count - 1, clockSpeed: main, sloops}, {machines: 1, clockSpeed: this.roundClock(last), sloops}];
			}
			case 'overclock-last': {
				const main = Math.floor(exact);
				const last = this.roundClock(total - (count - 1) * main);
				return total - (count - 1) * main > MAX_CLOCK
					? [{machines: count, clockSpeed: exact, sloops}]
					: [{machines: count - 1, clockSpeed: main, sloops}, {machines: 1, clockSpeed: last, sloops}];
			}
		}
	}

	/** 1e-9 is the solver's snap grid: smaller remainders are dust. */
	private wholeMachines(amount: number): number
	{
		return Math.max(1, Math.ceil(amount - 1e-9));
	}

	/** Only sub-1e-9 dust is dropped, since the capacity warning compares near-exactly. */
	public fromFractionalAmount(amount: number, clockSpeed: number, sloops: number): MachineGroup[]
	{
		const whole = Math.floor(amount + 1e-9);
		const remainder = amount - whole;

		if (remainder <= 1e-9) {
			return [{machines: Math.max(whole, 1), clockSpeed: this.roundClock(clockSpeed), sloops}];
		}

		// A remainder below the 1% minimum becomes a 1% machine rather than raising the other machines above the intended clock.
		const groups: MachineGroup[] = [];
		if (whole > 0) {
			groups.push({machines: whole, clockSpeed: this.roundClock(clockSpeed), sloops});
		}
		groups.push({machines: 1, clockSpeed: this.roundClock(remainder * clockSpeed), sloops});
		return groups;
	}

	/**
	 * The remainder rides on the last machine. Past the clock limit it is shared evenly by as many of the
	 * last machines as it takes; when even all of them cannot carry it, one more slow machine is added instead.
	 */
	private overclockLast(amount: number, clockSpeed: number, sloops: number): MachineGroup[]
	{
		const whole = Math.floor(amount + 1e-9);
		const remainder = amount - whole;
		const headroom = MAX_CLOCK - clockSpeed;
		if (whole === 0 || remainder <= 1e-9 || headroom <= 1e-9) {
			return this.fromFractionalAmount(amount, clockSpeed, sloops);
		}
		const extra = remainder * clockSpeed;
		const raised = Math.ceil(extra / headroom - 1e-9);
		if (raised > whole) {
			return this.fromFractionalAmount(amount, clockSpeed, sloops);
		}
		const groups: MachineGroup[] = [];
		if (whole > raised) {
			groups.push({machines: whole - raised, clockSpeed: this.roundClock(clockSpeed), sloops});
		}
		groups.push({machines: raised, clockSpeed: this.roundClock(clockSpeed + extra / raised), sloops});
		return groups;
	}

}
