import {Injectable, Signal, computed, signal} from '@angular/core';
import {GraphSnapshot} from '@src/Model/Planner/Graph/GraphSnapshot';

const MAX_DEPTH = 50;

/**
 * In-memory undo/redo of graph states for the active planner session.
 * Callers push a snapshot BEFORE each mutating operation (node edit, lock
 * change, solve application); node position moves are deliberately not
 * tracked. Cleared on plan switch.
 */
@Injectable()
export class GraphHistoryService
{

	private readonly undoStackSignal = signal<GraphSnapshot[]>([]);
	private readonly redoStackSignal = signal<GraphSnapshot[]>([]);

	public readonly canUndo: Signal<boolean> = computed(() => this.undoStackSignal().length > 0);
	public readonly canRedo: Signal<boolean> = computed(() => this.redoStackSignal().length > 0);

	public push(snapshot: GraphSnapshot): void
	{
		this.undoStackSignal.update(stack => [...stack, snapshot].slice(-MAX_DEPTH));
		this.redoStackSignal.set([]);
	}

	/** Returns the state to restore, banking the current state for redo; null when empty. */
	public undo(current: GraphSnapshot): GraphSnapshot | null
	{
		const stack = this.undoStackSignal();
		if (stack.length === 0) {
			return null;
		}
		const snapshot = stack[stack.length - 1];
		this.undoStackSignal.set(stack.slice(0, -1));
		this.redoStackSignal.update(redo => [...redo, current]);
		return snapshot;
	}

	/** Returns the state to restore, banking the current state for undo; null when empty. */
	public redo(current: GraphSnapshot): GraphSnapshot | null
	{
		const stack = this.redoStackSignal();
		if (stack.length === 0) {
			return null;
		}
		const snapshot = stack[stack.length - 1];
		this.redoStackSignal.set(stack.slice(0, -1));
		this.undoStackSignal.update(undo => [...undo, current]);
		return snapshot;
	}

	public clear(): void
	{
		this.undoStackSignal.set([]);
		this.redoStackSignal.set([]);
	}

}
