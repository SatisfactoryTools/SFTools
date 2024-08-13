import {Signal} from '@angular/core';
import {CodexLink} from '@src/Components/Codex/CodexLink';

/**
 * Where the codex currently is and how to link within it. The codex renders
 * in two hosts - the planner panel (state in a `?codex=` query param) and the
 * fullscreen page (state in the URL path) - and each provides its own
 * implementation, so codex content builds links exactly one way and works in
 * both. Codex paths are strings like '', 'items' or 'items/Desc_Cable_C'.
 */
export abstract class CodexNavigation
{

	/** The current codex path; '' means the section menu. */
	public abstract readonly path: Signal<string>;

	public abstract linkFor(path: string): CodexLink;

}
