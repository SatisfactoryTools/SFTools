import {HelpTopicDefinition} from '@src/Model/Help/HelpTopicDefinition';
import {HelpTopicGroup} from '@src/Model/Help/HelpTopicGroup';
import {HelpTopicId} from '@src/Model/Help/HelpTopicId';

/**
 * The one list of help topics: every id the app can ask for, what it is about
 * and where it is asked from.
 *
 * Buttons name a topic, articles claim one, and this is what pairs them up -
 * the help editor lists these so a writer sees at a glance which topics are
 * still waiting for an article. Adding a question-mark button means adding its
 * id to HelpTopicId and a line here first.
 */
export class HelpTopicCatalog
{

	public static readonly DEFINITIONS: HelpTopicDefinition[] = [
		// The planner. Most of these have no button of their own - they are the
		// ground the other articles stand on, reached from the help browser.
		{topic: 'planner.first-plan', group: 'planner', label: 'Making a first plan', where: 'The walkthrough for a new reader; no button.'},
		{topic: 'planner.graph', group: 'planner', label: 'Reading the graph', where: 'What the nodes and connections on the canvas mean; no button.'},
		{topic: 'planner.manual-editing', group: 'planner', label: 'Editing the graph by hand', where: 'Dragging connections, locks and targets; no button.'},
		{topic: 'planner.machine-groups', group: 'planner', label: 'Machine groups', where: 'Inspector, next to "Machine groups".'},
		{topic: 'planner.subplans', group: 'planner', label: 'Subplans', where: 'Plans inside a plan; no button.'},
		{topic: 'planner.calculation', group: 'planner', label: 'How a plan is calculated', where: 'What Calculate does with the request; no button.'},
		{topic: 'planner.folders', group: 'planner', label: 'Plans and folders', where: 'How the plan tree and folder settings work; no button.'},
		{topic: 'planner.sharing', group: 'planner', label: 'Sharing plans', where: 'The Share window.'},
		{topic: 'planner.save-import', group: 'planner', label: 'Loading a game save', where: 'Reading unlocks out of a save file; no button.'},
		{topic: 'planner.old-tools', group: 'planner', label: 'Importing from the old tools', where: 'The import dialog in the Plans panel; no button.'},
		{topic: 'planner.panels', group: 'planner', label: 'Panels, docking and floating', where: 'How panels are arranged; no button.'},

		// Panels. Each one shows its topic in the tab strip.
		{topic: 'panel.plans', group: 'panels', label: 'Plans panel', where: 'Plans panel tab strip.'},
		{topic: 'panel.calculator', group: 'panels', label: 'Production request panel', where: 'Production request panel tab strip.'},
		{topic: 'panel.overview', group: 'panels', label: 'Overview panel', where: 'Overview panel tab strip.'},
		{topic: 'panel.inspector', group: 'panels', label: 'Inspector panel', where: 'Inspector panel tab strip.'},
		{topic: 'panel.power', group: 'panels', label: 'Power panel', where: 'Power panel tab strip.'},
		{topic: 'panel.items', group: 'panels', label: 'Items panel', where: 'Items panel tab strip.'},
		{topic: 'panel.build-cost', group: 'panels', label: 'Build cost panel', where: 'Build cost panel tab strip.'},
		{topic: 'panel.settings', group: 'panels', label: 'Planner settings panel', where: 'Planner settings panel tab strip.'},
		{topic: 'panel.codex', group: 'panels', label: 'Codex panel', where: 'Codex panel tab strip.'},
		{topic: 'panel.help', group: 'panels', label: 'Help panel', where: 'Help panel tab strip.'},

		// Production request tabs, in the order the tabs sit in.
		{topic: 'request.production', group: 'request', label: 'Request tab', where: 'Production request panel, Request tab.'},
		{topic: 'request.resources', group: 'request', label: 'Resources tab', where: 'Production request panel, Resources tab.'},
		{topic: 'request.recipes', group: 'request', label: 'Recipes tab', where: 'Production request panel, Recipes tab.'},
		{topic: 'request.machines', group: 'request', label: 'Machines tab', where: 'Production request panel, Machines tab.'},
		{topic: 'request.input', group: 'request', label: 'Input tab', where: 'Production request panel, Input tab.'},
		{topic: 'request.byproducts', group: 'request', label: 'Byproducts tab', where: 'Production request panel, Byproducts tab.'},
		{topic: 'request.power', group: 'request', label: 'Power tab', where: 'Production request panel, Power tab.'},
		{topic: 'request.sink', group: 'request', label: 'Sink tab', where: 'Production request panel, Sink tab.'},
		{topic: 'request.sloops', group: 'request', label: 'Sloops tab', where: 'Production request panel, Sloops tab.'},
		{topic: 'request.overclocking', group: 'request', label: 'Overclocking tab', where: 'Production request panel, Overclocking tab.'},
		{topic: 'request.optimisation', group: 'request', label: 'Optimisation tab', where: 'Production request panel, Optimisation tab.'},

		// Settings page, one per section header.
		{topic: 'settings.numbers', group: 'settings', label: 'Number settings', where: 'Settings page, Numbers section.'},
		{topic: 'settings.graph', group: 'settings', label: 'Graph settings', where: 'Settings page, Graph section.'},
		{topic: 'settings.planner', group: 'settings', label: 'Planner settings', where: 'Settings page, Planner section.'},
		{topic: 'settings.hotkeys', group: 'settings', label: 'Hotkey settings', where: 'Settings page, Hotkeys section.'},
		{topic: 'settings.account', group: 'settings', label: 'Account settings', where: 'Settings page, Account section.'},

		// The rest of the site.
		{topic: 'versions.game', group: 'elsewhere', label: 'Game versions', where: 'Home page, next to "Game versions".'},
		{topic: 'versions.custom', group: 'elsewhere', label: 'Custom game versions', where: 'Home page and the create-version page.'},
		{topic: 'mods.overview', group: 'elsewhere', label: 'Mods', where: 'Mods page heading.'},
		{topic: 'mods.editor', group: 'elsewhere', label: 'Mod editor', where: 'Mod editor heading.'},
		{topic: 'account.plans', group: 'elsewhere', label: 'Accounts and where plans are saved', where: 'Signing in and what it keeps; no button.'},
	];

	public static readonly GROUPS: {group: HelpTopicGroup; label: string; description: string}[] = [
		{group: 'planner', label: 'The planner', description: 'The graph, the plans in it and what the planner can read.'},
		{group: 'panels', label: 'Panels', description: 'One topic per panel, asked from its tab strip.'},
		{group: 'request', label: 'Production request', description: 'One topic per tab of the production request panel.'},
		{group: 'settings', label: 'Settings', description: 'One topic per section of the settings page.'},
		{group: 'elsewhere', label: 'Elsewhere', description: 'Versions, mods and the account, outside the planner.'},
	];

	private static byTopic: Map<string, HelpTopicDefinition> | null = null;

	public static definition(topic: string): HelpTopicDefinition | null
	{
		if (HelpTopicCatalog.byTopic === null) {
			HelpTopicCatalog.byTopic = new Map(HelpTopicCatalog.DEFINITIONS.map(definition => [definition.topic, definition]));
		}
		return HelpTopicCatalog.byTopic.get(topic) ?? null;
	}

	public static definitionsOf(group: HelpTopicGroup): HelpTopicDefinition[]
	{
		return HelpTopicCatalog.DEFINITIONS.filter(definition => definition.group === group);
	}

	/** Whether an id an article claims is one the app actually asks for. */
	public static knows(topic: string): topic is HelpTopicId
	{
		return HelpTopicCatalog.definition(topic) !== null;
	}

}
