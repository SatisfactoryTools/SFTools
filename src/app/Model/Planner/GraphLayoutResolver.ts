import {Injectable} from '@angular/core';
import {GraphLayoutDefaults} from '@src/Model/Planner/GraphLayoutDefaults';
import {GraphLayoutSettings} from '@src/Model/Planner/GraphLayoutSettings';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

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
