/**
 * How a recipe node presents its machine counts and clock speeds:
 * - total-and-groups: bold total of machines to build, then one line per machine group
 * - decimal: a single line with the exact fractional machine count ("3.85× Constructor @ 150%"), ignoring groups
 * - percent: a single line with the total clock percentage needed ("385% Constructor" = 3.85 machines at 100%), ignoring groups
 * - groups-only: one line per machine group, without the build total
 */
export type MachineDisplayMode = 'total-and-groups' | 'decimal' | 'percent' | 'groups-only';
