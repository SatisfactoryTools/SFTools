/**
 * Cancellation handle for a multi-solve run (the maximise loop). Tearing down
 * the outer Observable flips `cancelled` and invokes `cancelCurrent`, which
 * unsubscribes the in-flight solve (killing the solver worker) and rejects
 * the promise the loop is awaiting.
 */
export interface SolveRunHandle
{

	cancelled: boolean;
	cancelCurrent: (() => void) | null;

}
