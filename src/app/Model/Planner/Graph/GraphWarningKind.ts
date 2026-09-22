/**
 * What a single plan warning is about. Drives its wording and colour in the
 * warnings list, and lets the list be filtered down to one kind at a time.
 */
export type GraphWarningKind = 'input' | 'output' | 'surplus' | 'capacity' | 'pool';
