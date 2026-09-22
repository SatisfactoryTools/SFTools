import {HotkeyAction} from '@src/Model/Hotkeys/HotkeyAction';
import {HotkeyDefinition} from '@src/Model/Hotkeys/HotkeyDefinition';
import {HotkeyGroup} from '@src/Model/Hotkeys/HotkeyGroup';

/**
 * Every bindable action of the app, with its wording and factory key.
 *
 * The keys are unique across the whole list on purpose: a hotkey never has to
 * guess whether the graph or the Plans panel meant it, so the same key never
 * does two things. Only the actions people reach for often ship with a key -
 * the rest are listed here unbound, ready to be given one in the settings.
 */
export class HotkeyCatalog
{

	public static readonly DEFINITIONS: HotkeyDefinition[] = [
		// Canvas. Everything below works on the current selection, so the
		// node entries do nothing while nothing is selected.
		{action: 'graph.addNode', group: 'graph', label: 'Add node', hint: 'Opens the add-node dialog in the middle of the canvas.', default: {key: 'a'}},
		{action: 'graph.createSubplan', group: 'graph', label: 'Create empty subplan', default: {key: 'a', shift: true}},
		{action: 'graph.inspectNode', group: 'graph', label: 'Inspect node', hint: 'Opens the Inspector panel on the selected node.', default: {key: 'i'}},
		{action: 'graph.openSubplan', group: 'graph', label: 'Open subplan', default: {key: 'o'}},
		{action: 'graph.convertToSubplan', group: 'graph', label: 'Convert selection to subplan', default: {key: 'g'}},
		{action: 'graph.toggleLock', group: 'graph', label: 'Lock or unlock node', default: {key: 'l'}},
		{action: 'graph.toggleDone', group: 'graph', label: 'Mark as done or not done', default: {key: 'Enter'}},
		{action: 'graph.deleteNode', group: 'graph', label: 'Delete node', default: {key: 'Delete'}},
		{action: 'graph.splitByInputs', group: 'graph', label: 'Split node by inputs', default: null},
		{action: 'graph.splitByOutputs', group: 'graph', label: 'Split node by outputs', default: null},
		{action: 'graph.splitByBoth', group: 'graph', label: 'Split node by inputs and outputs', default: null},
		{action: 'graph.shrinkToConnections', group: 'graph', label: 'Shrink node to connections', default: null},
		{action: 'graph.growToConnections', group: 'graph', label: 'Grow node to connections', default: null},
		{action: 'graph.disableRecipe', group: 'graph', label: "Disable the node's recipe", default: null},
		{action: 'graph.disableMachine', group: 'graph', label: "Disable the node's machine", default: null},
		{action: 'graph.disableFuel', group: 'graph', label: "Disable the node's fuel", default: null},
		{action: 'graph.disableGenerator', group: 'graph', label: "Disable the node's generator", default: null},
		{action: 'graph.disableByproduct', group: 'graph', label: 'Disable the byproduct', default: null},
		{action: 'graph.removeProduct', group: 'graph', label: 'Remove the product from the request', default: null},
		{action: 'graph.disableResource', group: 'graph', label: 'Disable the resource', default: null},
		{action: 'graph.removeInput', group: 'graph', label: 'Remove the input', default: null},

		// The plan as a whole.
		{action: 'planner.calculate', group: 'planner', label: 'Calculate the plan', default: {key: 'Enter', ctrl: true}},
		{action: 'planner.rearrange', group: 'planner', label: 'Rearrange the graph', default: {key: 'r'}},
		{action: 'planner.undo', group: 'planner', label: 'Undo', default: {key: 'z', ctrl: true}},
		{action: 'planner.redo', group: 'planner', label: 'Redo', default: {key: 'z', ctrl: true, shift: true}},
		{action: 'planner.zoomIn', group: 'planner', label: 'Zoom in', default: {key: '+', ctrl: true}},
		{action: 'planner.zoomOut', group: 'planner', label: 'Zoom out', default: {key: '-', ctrl: true}},
		{action: 'planner.zoomFit', group: 'planner', label: 'Fit the graph to the screen', default: {key: 'f'}},

		// Production request tabs, on the number row left to right in the order
		// the tabs themselves sit in.
		{action: 'calculator.request', group: 'calculator', label: 'Request', default: {key: '1'}},
		{action: 'calculator.resources', group: 'calculator', label: 'Resources', default: {key: '2'}},
		{action: 'calculator.recipes', group: 'calculator', label: 'Recipes', default: {key: '3'}},
		{action: 'calculator.machines', group: 'calculator', label: 'Machines', default: {key: '4'}},
		{action: 'calculator.input', group: 'calculator', label: 'Input', default: {key: '5'}},
		{action: 'calculator.byproducts', group: 'calculator', label: 'Byproducts', default: {key: '6'}},
		{action: 'calculator.power', group: 'calculator', label: 'Power', default: {key: '7'}},
		{action: 'calculator.sink', group: 'calculator', label: 'Sink', default: {key: '8'}},
		{action: 'calculator.sloops', group: 'calculator', label: 'Sloops', default: {key: '9'}},
		{action: 'calculator.overclocking', group: 'calculator', label: 'Overclocking', default: {key: '0'}},
		{action: 'calculator.optimisation', group: 'calculator', label: 'Optimisation', default: {key: '-'}},

		// Panels: open the panel and bring it to the front, or close it when
		// it already is the one in front.
		{action: 'panel.plans', group: 'panels', label: 'Plans', default: {key: '1', alt: true}},
		{action: 'panel.calculator', group: 'panels', label: 'Production request', default: {key: '2', alt: true}},
		{action: 'panel.overview', group: 'panels', label: 'Overview', default: {key: '3', alt: true}},
		{action: 'panel.inspector', group: 'panels', label: 'Inspector', default: {key: '4', alt: true}},
		{action: 'panel.power', group: 'panels', label: 'Power', default: {key: '5', alt: true}},
		{action: 'panel.items', group: 'panels', label: 'Items', default: {key: '6', alt: true}},
		{action: 'panel.buildCost', group: 'panels', label: 'Build cost', default: {key: '7', alt: true}},
		{action: 'panel.plannerSettings', group: 'panels', label: 'Planner settings', default: {key: '8', alt: true}},
		{action: 'panel.codex', group: 'panels', label: 'Codex', default: {key: '9', alt: true}},
		{action: 'panel.help', group: 'panels', label: 'Help', default: {key: '0', alt: true}},

		// Plans tree. There is no "selected row" in the tree - these work on
		// the plan that is open, and on the folder it sits in.
		{action: 'plans.newPlan', group: 'plans', label: 'New plan', default: {key: 'n', ctrl: true}},
		{action: 'plans.newFolder', group: 'plans', label: 'New folder', default: {key: 'n', ctrl: true, shift: true}},
		{action: 'plans.renamePlan', group: 'plans', label: 'Rename the open plan', default: {key: 'F2', shift: true}},
		{action: 'plans.clonePlan', group: 'plans', label: 'Clone the open plan', default: {key: 'd', ctrl: true}},
		{action: 'plans.sharePlan', group: 'plans', label: 'Share the open plan', default: {key: 's', ctrl: true, shift: true}},
		{action: 'plans.deletePlan', group: 'plans', label: 'Delete the open plan', default: {key: 'Delete', ctrl: true}},
		{action: 'plans.pickPlanIcon', group: 'plans', label: 'Pick an icon for the open plan', default: null},
		{action: 'plans.resetPlanIcon', group: 'plans', label: "Reset the open plan's icon", default: null},
		{action: 'plans.renameFolder', group: 'plans', label: 'Rename the open folder', hint: 'The folder the open plan is in.', default: null},
		{action: 'plans.cloneFolder', group: 'plans', label: 'Clone the open folder', default: null},
		{action: 'plans.shareFolder', group: 'plans', label: 'Share the open folder', default: null},
		{action: 'plans.deleteFolder', group: 'plans', label: 'Delete the open folder', default: null},
		{action: 'plans.importOldTools', group: 'plans', label: 'Import from the old Satisfactory Tools', default: {key: 'i', alt: true}},

		// Anywhere in the app.
		{action: 'app.search', group: 'app', label: 'Search', default: {key: 'q', ctrl: true}},
		{action: 'app.settings', group: 'app', label: 'Open settings', default: {key: '/'}},
		{action: 'app.home', group: 'app', label: 'Go to the start page', default: null},
		{action: 'app.back', group: 'app', label: 'Go back', hint: 'Follows the page\'s back link - "Back to planner" where the navbar offers it.', default: {key: 'Escape'}},
	];

	/** Group headings for the settings list, in display order. */
	public static readonly GROUPS: {group: HotkeyGroup; label: string; description: string}[] = [
		{group: 'graph', label: 'Canvas', description: 'Work on the node or nodes selected on the canvas.'},
		{group: 'planner', label: 'Plan', description: 'Calculating, undo and moving around the canvas.'},
		{group: 'calculator', label: 'Production request', description: 'Open the production request panel on one of its tabs.'},
		{group: 'panels', label: 'Panels', description: 'Open a panel, or close it when it is already in front.'},
		{group: 'plans', label: 'Plans', description: 'Work on the plan that is open, and on the folder it sits in.'},
		{group: 'app', label: 'Everywhere', description: 'Work on every page of the site.'},
	];

	private static byAction: Map<HotkeyAction, HotkeyDefinition> | null = null;

	public static definition(action: HotkeyAction): HotkeyDefinition | null
	{
		if (HotkeyCatalog.byAction === null) {
			HotkeyCatalog.byAction = new Map(HotkeyCatalog.DEFINITIONS.map(definition => [definition.action, definition]));
		}
		return HotkeyCatalog.byAction.get(action) ?? null;
	}

	public static definitionsOf(group: HotkeyGroup): HotkeyDefinition[]
	{
		return HotkeyCatalog.DEFINITIONS.filter(definition => definition.group === group);
	}

	/** The action's name for lists that only have its id (the login settings clash). */
	public static label(action: string): string | null
	{
		return HotkeyCatalog.definition(action as HotkeyAction)?.label ?? null;
	}

}
