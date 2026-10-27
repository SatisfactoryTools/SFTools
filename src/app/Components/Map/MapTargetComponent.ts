import {ChangeDetectionStrategy, Component, computed} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronDown, faUpRightFromSquare, faXmark} from '@fortawesome/free-solid-svg-icons';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {PageMapTargetSource} from '@src/Components/Map/PageMapTargetSource';
import {PlanTreeIconComponent} from '@src/Components/Planner/Panels/Plans/PlanTreeIconComponent';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {MapTarget} from '@src/Model/Map/MapTarget';
import {MapTargetOption} from '@src/Model/Map/MapTargetOption';
import {Folder} from '@src/Model/Planner/Folder';
import {PlanIconResolver} from '@src/Model/Planner/PlanIconResolver';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';
import {PlanTreeFolder} from '@src/Model/Planner/PlanTreeFolder';
import {PlanTreePlan} from '@src/Model/Planner/PlanTreePlan';

@Component({
	selector: 'map-target',
	templateUrl: './MapTargetComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [RouterLink, FaIconComponent, BsDropdownModule, AppTooltipDirective, PlanTreeIconComponent],
	styles: `
		:host {
			display: inline-flex;
			max-width: 100%;
		}
		.target-card {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			min-width: 0;
			max-width: 100%;
		}
		.target-kind {
			font-size: 0.7rem;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			line-height: 1;
		}
		.target-menu {
			max-height: min(60vh, 480px);
			overflow-y: auto;
		}
	`,
})
export class MapTargetComponent
{

	public readonly faChevronDown = faChevronDown;
	public readonly faUpRightFromSquare = faUpRightFromSquare;
	public readonly faXmark = faXmark;

	public readonly options = computed<MapTargetOption[]>(() => {
		const options: MapTargetOption[] = [];
		for (const entry of this.planManager.planTree().entries) {
			this.collect(entry, 0, options);
		}
		return options;
	});

	public readonly plannerLink = computed<string[] | null>(() => {
		const version = this.versionManager.activeVersion();
		const plan = this.targets.target()?.plan ?? null;
		if (version === null) {
			return null;
		}
		const slug = this.versionManager.urlSlug(version);
		return plan === null ? ['/', slug, 'planner'] : ['/', slug, 'planner', plan.id];
	});

	public constructor(
		public readonly targets: PageMapTargetSource,
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		private readonly planNames: PlanNameResolver,
		private readonly planIcons: PlanIconResolver,
		private readonly router: Router,
	)
	{
	}

	public name(target: MapTarget): string
	{
		return target.plan !== null ? this.planNames.displayName(target.plan) : target.folder!.name;
	}

	public iconHash(target: MapTarget): string | null
	{
		return target.plan === null ? null : this.planIcons.iconHash(target.plan);
	}

	public select(option: MapTargetOption): void
	{
		this.targets.select(option.target);
	}

	public clear(): void
	{
		this.targets.select(null);
	}

	/** Folders have no address in the planner: the folder is selected first, the planner then opens on it. */
	public openPlanner(event: MouseEvent, target: MapTarget): void
	{
		const link = this.plannerLink();
		if (target.folder === null || link === null) {
			return;
		}
		event.preventDefault();
		this.planManager.setActiveFolder(target.folder.id);
		void this.router.navigate(link);
	}

	private collect(entry: PlanTreeFolder | PlanTreePlan, depth: number, options: MapTargetOption[]): void
	{
		if ('folder' in entry) {
			options.push(this.folderOption(entry.folder, depth));
			for (const child of entry.entries) {
				this.collect(child, depth + 1, options);
			}
			return;
		}
		options.push({
			key: 'plan:' + entry.plan.id,
			target: MapTarget.ofPlan(entry.plan),
			name: this.planNames.displayName(entry.plan),
			depth,
			iconHash: this.planIcons.iconHash(entry.plan),
			subplan: entry.plan.parentPlanId !== null,
		});
		for (const subplan of entry.subplans) {
			this.collect(subplan, depth + 1, options);
		}
	}

	private folderOption(folder: Folder, depth: number): MapTargetOption
	{
		return {key: 'folder:' + folder.id, target: MapTarget.ofFolder(folder), name: folder.name, depth, iconHash: null, subplan: false};
	}

}
