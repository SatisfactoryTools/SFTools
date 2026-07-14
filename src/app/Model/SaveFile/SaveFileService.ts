import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {SaveFileUnlocks} from '@src/Model/SaveFile/SaveFileUnlocks';
import {SaveFileWorkerRequest} from '@src/Model/SaveFile/Worker/SaveFileWorkerRequest';
import {SaveFileWorkerResponse} from '@src/Model/SaveFile/Worker/SaveFileWorkerResponse';

const PARSE_TIMEOUT_MS = 120_000;

/**
 * Parses Satisfactory .sav files off the main thread and returns their unlock
 * progression. Saves run to several (tens of) MB and the parser is fully
 * synchronous, so each parse gets its own short-lived worker: unsubscribing
 * cancels the parse by terminating it, and completion frees the memory the
 * parsed save occupied.
 */
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
				subscriber.error(new Error(`Parsing the save file timed out after ${Math.round(PARSE_TIMEOUT_MS / 1000)} s.`));
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
				subscriber.error(new Error('The save file parser crashed unexpectedly.'));
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
