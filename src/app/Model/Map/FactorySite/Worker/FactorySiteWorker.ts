/// <reference lib="webworker" />
import {FactorySiteScorer} from '@src/Model/Map/FactorySite/FactorySiteScorer';
import type {FactorySiteWorkerRequest} from './FactorySiteWorkerRequest';
import type {FactorySiteWorkerResponse} from './FactorySiteWorkerResponse';

const scorer = new FactorySiteScorer();

addEventListener('message', ({data}: MessageEvent<FactorySiteWorkerRequest>) => {
	const scores = scorer.scoreGrid(data.grid, data.mask, data.resources, data.mode);
	postMessage({id: data.id, scores} satisfies FactorySiteWorkerResponse, [scores.buffer]);
});
