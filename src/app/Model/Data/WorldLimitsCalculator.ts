import {Injectable} from '@angular/core';
import {PurityCounts} from '@src/Model/API/Schema/World/PurityCounts';

// Per-node extraction at 250% clock, by purity (impure ×0.5, pure ×2 of
// normal). Solids: Miner Mk.3 (240/min base). Fluid nodes: Oil Extractor
// (120/min base). Well satellites: Resource Well Extractor (60/min base).
const SOLID_NODE_RATES: PurityCounts = {impure: 300, normal: 600, pure: 1200};
const FLUID_NODE_RATES: PurityCounts = {impure: 150, normal: 300, pure: 600};
const WELL_SATELLITE_RATES: PurityCounts = {impure: 75, normal: 150, pure: 300};

// One extractor feeds one belt/pipe, so each node caps at the best conveyor.
const BELT_CAP = 1200;
const PIPE_CAP = 600;

/**
 * Derives per-minute resource limits from world-data node counts: every node
 * runs the best extractor at 250%, capped by what a single belt (solids,
 * 1200/min) or pipe (fluids, 600/min) can carry away. Geysers produce no
 * item and are ignored (until geothermal power planning uses them).
 */
@Injectable({providedIn: 'root'})
export class WorldLimitsCalculator
{

	/** Limit of one resource from its miner nodes and/or well satellites. */
	public rowLimit(nodes: PurityCounts | null, satellites: PurityCounts | null, solid: boolean): number
	{
		let total = 0;
		if (nodes !== null) {
			total += this.total(nodes, solid ? SOLID_NODE_RATES : FLUID_NODE_RATES, solid ? BELT_CAP : PIPE_CAP);
		}
		if (satellites !== null) {
			total += this.total(satellites, WELL_SATELLITE_RATES, PIPE_CAP);
		}
		return total;
	}

	private total(counts: PurityCounts, rates: PurityCounts, cap: number): number
	{
		return counts.impure * Math.min(rates.impure, cap)
			+ counts.normal * Math.min(rates.normal, cap)
			+ counts.pure * Math.min(rates.pure, cap);
	}

}
