/**
 * How the production request tab strip shows its labels: fitted to the
 * available width (labels, then icons with the active label, then a
 * dropdown), icons with the active label whenever they fit, or labels always
 * (wrapping onto more rows). Panels too narrow even for the icon strip show
 * the dropdown regardless of the preference.
 */
export type TabLabelsMode = 'auto' | 'icons' | 'labels';
