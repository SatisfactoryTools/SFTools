import {GraphLayoutSettings} from '@src/Model/Planner/GraphLayoutSettings';

export class GraphLayoutDefaults
{

	public static readonly SETTINGS: GraphLayoutSettings = {
		direction: 'left',
		edgeShape: 'multisegment',
		nodeSpacing: 20,
		layerSpacing: 20,
		machineColors: {},
	};

	public static resolve(settings: Partial<GraphLayoutSettings> | undefined): GraphLayoutSettings
	{
		return {
			...GraphLayoutDefaults.SETTINGS,
			...settings,
			machineColors: {...(settings?.machineColors ?? {})},
		};
	}

}
