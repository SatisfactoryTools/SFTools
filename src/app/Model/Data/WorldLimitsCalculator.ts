import {Injectable} from '@angular/core';
import {PurityCounts} from '@src/Model/API/Schema/World/PurityCounts';

// Per-node extraction at 250% clock by purity (impure x0.5, pure x2 of normal):
// Miner Mk.3 240/min, Oil Extractor 120/min, Resource Well Extractor 60/min base.
const SOLID_NODE_RATES: PurityCounts = {impure: 300, normal: 600, pure: 1200};
const FLUID_NODE_RATES: PurityCounts = {impure: 150, normal: 300, pure: 600};
const WELL_SATELLITE_RATES: PurityCounts = {impure: 75, normal: 150, pure: 300};

// One extractor feeds one belt/pipe, so each node caps at the best conveyor.
const BELT_CAP = 1200;
const PIPE_CAP = 600;

@Injectable({providedIn: 'root'})
export class WorldLimitsCalculator
{

	public rowLimit(nodes: PurityCounts | null, satellites: PurityCounts | null, solid: boolean, beltCap: number = BELT_CAP, pipeCap: number = PIPE_CAP): number
	{
		let total = 0;
		if (nodes !== null) {
			total += this.total(nodes, solid ? SOLID_NODE_RATES : FLUID_NODE_RATES, solid ? beltCap : pipeCap);
		}
		if (satellites !== null) {
			total += this.total(satellites, WELL_SATELLITE_RATES, pipeCap);
		}
		return total;
	}

	public nodeRate(purity: keyof PurityCounts, solid: boolean, satellite: boolean, beltCap: number = BELT_CAP, pipeCap: number = PIPE_CAP): number
	{
		if (satellite) {
			return Math.min(WELL_SATELLITE_RATES[purity], pipeCap);
		}
		return solid ? Math.min(SOLID_NODE_RATES[purity], beltCap) : Math.min(FLUID_NODE_RATES[purity], pipeCap);
	}

	private total(counts: PurityCounts, rates: PurityCounts, cap: number): number
	{
		return counts.impure * Math.min(rates.impure, cap)
			+ counts.normal * Math.min(rates.normal, cap)
			+ counts.pure * Math.min(rates.pure, cap);
	}

}
