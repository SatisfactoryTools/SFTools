/**
 * Solve accuracy for somersloop placement (a MIP): translates to the solver's
 * allowed relative deviation from the optimal objective. Higher accuracy can
 * take much longer - minutes on large plans.
 */
export type SloopAccuracy = 'low' | 'medium' | 'high';
