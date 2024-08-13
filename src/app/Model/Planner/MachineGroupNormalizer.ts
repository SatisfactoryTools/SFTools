import {Injectable} from '@angular/core';
import {Building} from '@src/Model/Data/Entities/Building';
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
