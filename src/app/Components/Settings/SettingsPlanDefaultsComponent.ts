import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {SettingsSectionComponent} from '@src/Components/Settings/SettingsSectionComponent';
import {GraphDirection} from '@src/Model/Planner/GraphDirection';
import {GraphEdgeShape} from '@src/Model/Planner/GraphEdgeShape';
import {GraphLayoutDefaults} from '@src/Model/Planner/GraphLayoutDefaults';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';
import {faFileCirclePlus} from '@fortawesome/free-solid-svg-icons';

/**
 * "Plan defaults" settings section - the recipe selection, graph layout and
 * machine grouping a plan uses until it sets its own. The same controls sit
 * in the planner's Settings panel per plan; these are what they start from.
 */
@Component({
	selector: 'settings-plan-defaults',
	templateUrl: './SettingsPlanDefaultsComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, SettingsSectionComponent, InfoNoteComponent],
})
export class SettingsPlanDefaultsComponent
{

	public readonly sectionIcon = faFileCirclePlus;

	public constructor(private readonly settings: SettingsManager)
	{
	}

	public get alternateRecipes(): boolean
	{
		return this.settings.planDefaults().alternateRecipes;
	}

	public setAlternateRecipes(value: boolean): void
	{
		this.settings.updatePlanDefaults({alternateRecipes: value});
	}

	public get conversionRecipes(): boolean
	{
		return this.settings.planDefaults().conversionRecipes;
	}

	public setConversionRecipes(value: boolean): void
	{
		this.settings.updatePlanDefaults({conversionRecipes: value});
	}

	public get graphDirection(): GraphDirection
	{
		return this.settings.planDefaults().graphDirection;
	}

	public setGraphDirection(value: GraphDirection): void
	{
		this.settings.updatePlanDefaults({graphDirection: value});
	}

	public get graphEdgeShape(): GraphEdgeShape
	{
		return this.settings.planDefaults().graphEdgeShape;
	}

	public setGraphEdgeShape(value: GraphEdgeShape): void
	{
		this.settings.updatePlanDefaults({graphEdgeShape: value});
	}

	public get graphNodeSpacing(): number
	{
		return this.settings.planDefaults().graphNodeSpacing;
	}

	/** Range inputs emit strings through ngModel - coerce before storing. */
	public setGraphNodeSpacing(value: number | string): void
	{
		this.settings.updatePlanDefaults({graphNodeSpacing: this.toSpacing(value, GraphLayoutDefaults.SETTINGS.nodeSpacing)});
	}

	public get graphLayerSpacing(): number
	{
		return this.settings.planDefaults().graphLayerSpacing;
	}

	public setGraphLayerSpacing(value: number | string): void
	{
		this.settings.updatePlanDefaults({graphLayerSpacing: this.toSpacing(value, GraphLayoutDefaults.SETTINGS.layerSpacing)});
	}

	public get groupingMode(): GroupingMode
	{
		return this.settings.planDefaults().groupingMode;
	}

	public setGroupingMode(value: GroupingMode): void
	{
		this.settings.updatePlanDefaults({groupingMode: value});
	}

	private toSpacing(value: number | string, fallback: number): number
	{
		const parsed = Number(value);
		return Number.isFinite(parsed) ? Math.min(200, Math.max(0, parsed)) : fallback;
	}

}
