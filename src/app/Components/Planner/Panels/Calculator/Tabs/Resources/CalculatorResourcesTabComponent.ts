import {Component, OnDestroy, ChangeDetectionStrategy} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Subscription} from 'rxjs';
import {FormsModule} from '@angular/forms';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {ResourceLimitRow} from '@src/Components/Planner/Panels/Calculator/Tabs/Resources/ResourceLimitRow';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {RateFormatter} from '@src/Model/RateFormatter';

/**
 * Per-minute mining caps the solver must respect. Every raw resource starts
 * infinite; unchecking "infinite" caps it at the entered rate (0 forbids
 * mining the resource entirely). Edits the active plan's settings, or the
 * active folder's custom default settings.
 */
@Component({
	selector: 'calculator-resources-tab',
	templateUrl: './CalculatorResourcesTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, GameIconComponent],
})
export class CalculatorResourcesTabComponent implements OnDestroy
{

	public rows: ResourceLimitRow[] = [];

	public iconHash(className: string): string | null
	{
		return this.versionManager.activeVersionData()?.iconForClassName(className) ?? null;
	}

	/** JSON of the limits the rows were last built from or synced to - external changes rebuild the rows. */
	private loadedLimits: string | null = null;
	private readonly subscription = new Subscription();

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		private readonly rateFormatter: RateFormatter,
	)
	{
		this.loadFrom(this.planManager.activeSettings());

		this.subscription.add(
			toObservable(this.planManager.activeSettings).subscribe(settings => {
				// Skip echoes of this tab's own sync(); anything else (owner
				// switch, reset, inherit) replaces the row drafts.
				if (this.limitsKey(settings) !== this.loadedLimits) {
					this.loadFrom(settings);
				}
			}),
		);
	}

	public rateUnit(className: string): string
	{
		const item = this.versionManager.activeVersionData()?.searchItemByClassName(className) ?? null;
		return this.rateFormatter.unit(item);
	}

	public sync(): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) return;

		const limits: Record<string, number> = {};
		this.rows.forEach(row => {
			if (!row.infinite) {
				limits[row.className] = Math.max(0, row.limit);
			}
		});
		const resourceLimits = Object.keys(limits).length > 0 ? limits : undefined;
		this.loadedLimits = JSON.stringify(resourceLimits ?? {});
		this.planManager.updateActiveSettings({...settings, resourceLimits});
	}

	public ngOnDestroy(): void
	{
		this.subscription.unsubscribe();
	}

	private loadFrom(settings: PlanSettings | null): void
	{
		this.loadedLimits = this.limitsKey(settings);
		this.rows = settings ? this.buildRows(settings) : [];
	}

	private limitsKey(settings: PlanSettings | null): string | null
	{
		return settings ? JSON.stringify(settings.resourceLimits ?? {}) : null;
	}

	private buildRows(settings: PlanSettings): ResourceLimitRow[]
	{
		const data = this.versionManager.activeVersionData();
		if (!data) return [];
		const limits = settings.resourceLimits ?? {};

		return data.resources
			.map(className => {
				const limit = limits[className];
				return {
					className,
					name: data.searchItemByClassName(className)?.name ?? className,
					limit: limit ?? 0,
					infinite: limit === undefined,
				};
			})
			.sort((a, b) => a.name.localeCompare(b.name));
	}

}
