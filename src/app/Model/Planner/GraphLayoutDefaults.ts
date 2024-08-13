import {GraphLayoutSettings} from '@src/Model/Planner/GraphLayoutSettings';

/** The layout used before these settings existed - the fallback everywhere. */
export class GraphLayoutDefaults
{

	public static readonly SETTINGS: GraphLayoutSettings = {
		direction: 'left',
		edgeShape: 'multisegment',
		nodeSpacing: 20,
		layerSpacing: 20,
		machineColors: {},
	};

	/** Fills gaps in a (possibly missing or partial) stored settings object. */
	public static resolve(settings: Partial<GraphLayoutSettings> | undefined): GraphLayoutSettings
	{
		return {
			...GraphLayoutDefaults.SETTINGS,
			...settings,
			machineColors: {...(settings?.machineColors ?? {})},
		};
	}

}
