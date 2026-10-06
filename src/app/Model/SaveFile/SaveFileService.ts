import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {SaveFileUnlocks} from '@src/Model/SaveFile/SaveFileUnlocks';
import {SaveFileWorkerRequest} from '@src/Model/SaveFile/Worker/SaveFileWorkerRequest';
import {SaveFileWorkerResponse} from '@src/Model/SaveFile/Worker/SaveFileWorkerResponse';

const PARSE_TIMEOUT_MS = 120_000;

/** Saves are tens of MB and the parser is synchronous, so each parse gets its own worker: unsubscribing terminates it and completion frees the memory. */
@Injectable({providedIn: 'root'})
export class SaveFileService
{

	public parse(file: File): Observable<SaveFileUnlocks>
	{
		return new Observable<SaveFileUnlocks>(subscriber => {
			const worker = new Worker(
				new URL('./Worker/SaveFileWorker', import.meta.url),
				{type: 'module'},
			);
			const timeoutId = setTimeout(() => {
				subscriber.error(new Error(`Reading the save file took too long (${Math.round(PARSE_TIMEOUT_MS / 1000)} s) and was stopped.`));
			}, PARSE_TIMEOUT_MS);

			worker.addEventListener('message', ({data}: MessageEvent<SaveFileWorkerResponse>) => {
				if (data.error !== null) {
					subscriber.error(new Error(data.error));
					return;
				}
				subscriber.next(data.unlocks!);
				subscriber.complete();
			});
			worker.addEventListener('error', (event: ErrorEvent) => {
				console.error('[SaveFileWorker] Worker crashed:', event.message, event);
				subscriber.error(new Error('Reading the save file failed unexpectedly.'));
			});

			file.arrayBuffer().then(
				buffer => worker.postMessage({fileName: file.name, buffer} satisfies SaveFileWorkerRequest, [buffer]),
				() => subscriber.error(new Error('The selected file could not be read.')),
			);

			return () => {
				clearTimeout(timeoutId);
				worker.terminate();
			};
		});
	}

}
