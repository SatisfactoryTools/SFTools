/**
 * Every help topic the app knows about - the ids question-mark buttons are
 * placed with, and the ids articles claim in the editor. An article claims a
 * topic to answer it; a topic no article claims simply hides its button.
 *
 * The list is the contract between the two sides, so a button can never name
 * an id the editor does not offer, and a renamed id breaks the build instead
 * of silently hiding buttons.
 */
export type HelpTopicId =
	// The planner as a whole - the graph, the plans in it and what it can read.
	| 'planner.first-plan'
	| 'planner.graph'
	| 'planner.manual-editing'
	| 'planner.machine-groups'
	| 'planner.subplans'
	| 'planner.calculation'
	| 'planner.folders'
	| 'planner.sharing'
	| 'planner.save-import'
	| 'planner.old-tools'
	| 'planner.panels'
	// One per panel, shown in its tab strip.
	| 'panel.plans'
	| 'panel.calculator'
	| 'panel.overview'
	| 'panel.inspector'
	| 'panel.power'
	| 'panel.items'
	| 'panel.build-cost'
	| 'panel.settings'
	| 'panel.codex'
	| 'panel.help'
	// One per production request tab, shown next to the tab strip.
	| 'request.production'
	| 'request.resources'
	| 'request.recipes'
	| 'request.machines'
	| 'request.input'
	| 'request.byproducts'
	| 'request.power'
	| 'request.sink'
	| 'request.sloops'
	| 'request.overclocking'
	| 'request.optimisation'
	// One per section of the settings page.
	| 'settings.numbers'
	| 'settings.graph'
	| 'settings.planner'
	| 'settings.plan-defaults'
	| 'settings.hotkeys'
	| 'settings.account'
	// Versions, mods and the account outside the planner.
	| 'versions.game'
	| 'versions.custom'
	| 'mods.overview'
	| 'mods.editor'
	| 'account.plans';
