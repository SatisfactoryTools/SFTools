/** A solver settings group a folder can fix for its inner plans - one per calculator tab. */
export type SettingsGroup =
	| 'recipes'
	| 'machines'
	| 'byproducts'
	| 'resources'
	| 'power'
	| 'sink'
	| 'sloops'
	| 'overclocking'
	| 'optimisation';
