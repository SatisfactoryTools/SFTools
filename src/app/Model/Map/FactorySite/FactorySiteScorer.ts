import {FactorySiteExplanation} from '@src/Model/Map/FactorySite/FactorySiteExplanation';
import {FactorySiteGrid} from '@src/Model/Map/FactorySite/FactorySiteGrid';
import {FactorySiteMode} from '@src/Model/Map/FactorySite/FactorySiteMode';
import {FactorySiteResource} from '@src/Model/Map/FactorySite/FactorySiteResource';
import {FactorySiteResourceUse} from '@src/Model/Map/FactorySite/FactorySiteResourceUse';

/**
 * A spot is judged by the nodes a factory there would use: for each resource the nearest ones, closest first, until they cover the demand
 * (all of them when even that is not enough). Runs in a worker, so it must not depend on Angular.
 */
export class FactorySiteScorer
{

	private static readonly PICK_STEPS = 8;

	private distances = new Float64Array(0);
	private taken = new Uint8Array(0);

	public scoreGrid(grid: FactorySiteGrid, mask: Uint8Array | null, resources: FactorySiteResource[], mode: FactorySiteMode): Float32Array
	{
		const scores = new Float32Array(grid.columns * grid.rows);
		for (let row = 0; row < grid.rows; row++) {
			const y = grid.minY + (row + 0.5) * grid.cellSize;
			for (let column = 0; column < grid.columns; column++) {
				const index = row * grid.columns + column;
				if (mask !== null && mask[index] === 0) {
					scores[index] = NaN;
					continue;
				}
				const x = grid.minX + (column + 0.5) * grid.cellSize;
				let score = 0;
				for (const resource of resources) {
					const [farthest, total] = this.select(resource, x, y, null);
					score = mode === 'farthest'
						? Math.max(score, farthest * resource.factor)
						: score + total * resource.factor;
				}
				scores[index] = score;
			}
		}
		return scores;
	}

	public explain(x: number, y: number, resources: FactorySiteResource[], mode: FactorySiteMode): FactorySiteExplanation
	{
		let score = 0;
		const uses: FactorySiteResourceUse[] = resources.map(resource => {
			const nodes: number[] = [];
			const [farthest, total] = this.select(resource, x, y, nodes);
			score = mode === 'farthest' ? Math.max(score, farthest * resource.factor) : score + total * resource.factor;
			return {className: resource.className, nodes, farthest, total};
		});
		return {x, y, score, resources: uses};
	}

	/** Returns [farthest, total] distance of the nodes taken; `picked` collects their indexes when given. */
	private select(resource: FactorySiteResource, x: number, y: number, picked: number[] | null): [number, number]
	{
		const nodes = resource.nodes;
		const count = nodes.length / 3;
		if (this.distances.length < count) {
			this.distances = new Float64Array(count);
			this.taken = new Uint8Array(count);
		}
		for (let i = 0; i < count; i++) {
			const dx = nodes[i * 3] - x;
			const dy = nodes[i * 3 + 1] - y;
			this.distances[i] = Math.sqrt(dx * dx + dy * dy);
			this.taken[i] = 0;
		}

		// Usually only a few nodes are needed: picking the nearest one at a time beats sorting them all, until it does not.
		let covered = 0;
		let farthest = 0;
		let total = 0;
		const take = (index: number): void => {
			this.taken[index] = 1;
			covered += nodes[index * 3 + 2];
			farthest = this.distances[index];
			total += this.distances[index];
			picked?.push(index);
		};
		let step = 0;
		for (; step < FactorySiteScorer.PICK_STEPS && step < count && covered < resource.demand; step++) {
			let best = -1;
			for (let i = 0; i < count; i++) {
				if (this.taken[i] === 0 && (best === -1 || this.distances[i] < this.distances[best])) {
					best = i;
				}
			}
			take(best);
		}
		if (covered < resource.demand && step < count) {
			const rest: number[] = [];
			for (let i = 0; i < count; i++) {
				if (this.taken[i] === 0) {
					rest.push(i);
				}
			}
			rest.sort((a, b) => this.distances[a] - this.distances[b]);
			for (const index of rest) {
				if (covered >= resource.demand) {
					break;
				}
				take(index);
			}
		}
		return [farthest, total];
	}

}
