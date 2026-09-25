import {Injectable} from '@angular/core';
import {GraphLayoutDefaults} from '@src/Model/Planner/GraphLayoutDefaults';
import {GraphLayoutSettings} from '@src/Model/Planner/GraphLayoutSettings';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

/**
 * Resolves the layout a plan's graph is arranged with: the plan's own values
 * where it has them, the user's plan defaults for the rest. A plan only gets
 * its own once the layout is changed in its settings panel, so changing a
 * default here moves every plan that never touched it.
 */
@Injectable({providedIn: 'root'})
export class GraphLayoutResolver
{

	public constructor(private readonly settings: SettingsManager)
	{
	}

	public resolve(settings: Partial<GraphLayoutSettings> | undefined): GraphLayoutSettings
	{
		const defaults = this.settings.planDefaults();
		return {
			...GraphLayoutDefaults.SETTINGS,
			direction: defaults.graphDirection,
			edgeShape: defaults.graphEdgeShape,
			nodeSpacing: defaults.graphNodeSpacing,
			layerSpacing: defaults.graphLayerSpacing,
			...settings,
			machineColors: {...(settings?.machineColors ?? {})},
		};
	}

}
