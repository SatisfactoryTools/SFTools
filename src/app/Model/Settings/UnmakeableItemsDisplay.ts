/**
 * How item pickers treat items the active plan cannot currently produce
 * (no enabled recipe or generator fuel yields them, and they are not a raw
 * resource): offer them normally, strike them through at the end of the
 * list, or hide them entirely (spoiler protection).
 */
export type UnmakeableItemsDisplay = 'show' | 'strike' | 'hide';
