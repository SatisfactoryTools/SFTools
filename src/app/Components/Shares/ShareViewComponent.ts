import {AfterViewInit, Component, ChangeDetectionStrategy, ElementRef, OnDestroy, Signal, ViewChild, computed, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {toObservable} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCheck, faCopy, faFileLines, faFolder, faFolderOpen} from '@fortawesome/free-solid-svg-icons';
import {Subscription} from 'rxjs';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {PlannerNodeTooltipComponent} from '@src/Components/Planner/Tooltip/PlannerNodeTooltipComponent';
import {PlannerNodeTooltipService} from '@src/Components/Planner/Tooltip/PlannerNodeTooltipService';
import {SharesApiService} from '@src/Model/API/SharesApiService';
import {SharedFolderNode} from '@src/Model/API/Schema/Shares/SharedFolderNode';
import {SharedPlanNode} from '@src/Model/API/Schema/Shares/SharedPlanNode';
import {SharePayload} from '@src/Model/API/Schema/Shares/SharePayload';
import {Version} from '@src/Model/API/Schema/Version';
import {VersionsApiService} from '@src/Model/API/VersionsApiService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {NotificationService} from '@src/Model/NotificationService';
import {PlanSerializer} from '@src/Model/Planner/PlanSerializer';
import {ShareImportService} from '@src/Model/Shares/ShareImportService';
import {SharedPlanData} from '@src/Model/Shares/SharedPlanData';

/** One row of the shared tree sidebar. */
interface ShareTreeRow
{
	readonly kind: 'folder' | 'plan';
	readonly depth: number;
	readonly id: string;
	readonly name: string;
	/** The plan node behind a plan row; null for folders. */
	readonly plan: SharedPlanNode | null;
}

/**
 * Public, read-only view of a share: the frozen folder/plan tree on the
 * left, the selected plan's saved graph rendered read-only on the right.
 * The share's game version is activated so its data drives the graph
 * rendering - versions the viewer doesn't own are fetched via the public
 * GET /v1/versions/{id}; only if that fails does the tree show alone.
 * "Copy to my plans" clones the whole tree (fresh ids) into the viewer's
 * plan store for that version, and is only offered for owned versions.
 */
@Component({
	templateUrl: './ShareViewComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	providers: [PlannerGraphService, PanelLayoutService, PlannerActionsService, PlannerNodeTooltipService],
	imports: [DatePipe, FaIconComponent, RouterLink, PlannerNodeTooltipComponent],
	styles: `
		.share-tree {
			width: 280px;
			flex: none;
		}
		.share-tree-row {
			padding: 0.15rem 0.35rem;
			border-radius: 0.25rem;
		}
		.share-tree-row.selectable {
			cursor: pointer;
		}
		.share-tree-row.selectable:hover {
			background-color: rgba(255, 255, 255, 0.05);
		}
		.share-tree-row.active {
			background-color: rgba(74, 144, 217, 0.3);
		}
		.share-graph {
			height: calc(100vh - 260px);
			min-height: 360px;
		}
	`,
})
export class ShareViewComponent implements AfterViewInit, OnDestroy
{

	public readonly faCheck = faCheck;
	public readonly faCopy = faCopy;
	public readonly faFileLines = faFileLines;
	public readonly faFolder = faFolder;
	public readonly faFolderOpen = faFolderOpen;

	@ViewChild('graphContainer') private graphContainerRef?: ElementRef<HTMLElement>;

	private readonly subscription = new Subscription();

	private readonly payloadSignal = signal<SharePayload | null>(null);
	public readonly payload = this.payloadSignal.asReadonly();

	private readonly errorSignal = signal<string | null>(null);
	public readonly error = this.errorSignal.asReadonly();

	private readonly selectedPlanSignal = signal<SharedPlanNode | null>(null);
	public readonly selectedPlan = this.selectedPlanSignal.asReadonly();

	public copied = false;

	/** The shared version fetched publicly when the viewer doesn't own it; null until (unless) that fetch succeeds. */
	private readonly externalVersionSignal = signal<Version | null>(null);

	/** True once the public version lookup has failed - the version was deleted. */
	private readonly versionUnavailableSignal = signal(false);
	public readonly versionUnavailable = this.versionUnavailableSignal.asReadonly();

	/** The shared version resolved against the viewer's own version list; null when it belongs to someone else. */
	public readonly ownedVersion: Signal<Version | null> = computed(() => {
		const payload = this.payloadSignal();
		if (payload === null) {
			return null;
		}
		return this.versionManager.versions().find(candidate => candidate.id === payload.version.id) ?? null;
	});

	/** The shared version - owned or fetched publicly; null = unavailable (deleted or still loading). */
	public readonly version: Signal<Version | null> = computed(() => this.ownedVersion() ?? this.externalVersionSignal());

	/** Graphs can render once the shared version's game data has loaded. */
	public readonly dataReady = computed(() =>
		this.version() !== null && this.versionManager.activeVersionData() !== null);

	public readonly treeRows = computed<ShareTreeRow[]>(() => {
		const payload = this.payloadSignal();
		if (payload === null) {
			return [];
		}
		const rows: ShareTreeRow[] = [];
		const addPlan = (node: SharedPlanNode, depth: number): void => {
			rows.push({kind: 'plan', depth, id: node.id, name: node.name, plan: node});
			node.subplans.forEach(sub => addPlan(sub, depth + 1));
		};
		const addFolder = (node: SharedFolderNode, depth: number): void => {
			rows.push({kind: 'folder', depth, id: node.id, name: node.name, plan: null});
			node.children.forEach(child => addFolder(child, depth + 1));
			node.plans.forEach(plan => addPlan(plan, depth + 1));
		};
		if (payload.type === 'folder') {
			addFolder(payload.root as SharedFolderNode, 0);
		} else {
			addPlan(payload.root as SharedPlanNode, 0);
		}
		return rows;
	});

	public constructor(
		route: ActivatedRoute,
		sharesApi: SharesApiService,
		versionsApi: VersionsApiService,
		private readonly router: Router,
		protected readonly versionManager: VersionManager,
		private readonly planSerializer: PlanSerializer,
		private readonly plannerGraph: PlannerGraphService,
		private readonly actions: PlannerActionsService,
		private readonly shareImport: ShareImportService,
		private readonly notifications: NotificationService,
	)
	{
		const shareId = route.snapshot.paramMap.get('shareId') ?? '';
		sharesApi.getShare(shareId).subscribe({
			next: payload => {
				this.payloadSignal.set(payload);
				this.selectedPlanSignal.set(this.treeRows().find(row => row.plan !== null)?.plan ?? null);
				const owned = this.ownedVersion();
				if (owned !== null) {
					this.versionManager.setActiveVersion(this.versionManager.urlSlug(owned));
					return;
				}
				// Someone else's (custom) version - fetch it publicly so the
				// graphs can still render. If the version is gone, the tree
				// alone shows with an explanatory notice.
				versionsApi.getVersion(payload.version.id).subscribe({
					next: version => {
						this.externalVersionSignal.set(version);
						this.versionManager.setActiveExternalVersion(version);
					},
					error: () => this.versionUnavailableSignal.set(true),
				});
			},
			error: () => this.errorSignal.set('This share does not exist (or the link is malformed).'),
		});

		// Double-clicking a subplan node in the graph opens that subplan.
		this.subscription.add(this.actions.subplanOpenRequests.subscribe(subplanId => {
			const row = this.treeRows().find(candidate => candidate.id === subplanId && candidate.plan !== null);
			if (row?.plan) {
				this.selectedPlanSignal.set(row.plan);
			}
		}));

		// Render whenever the selected plan changes or the game data arrives.
		this.subscription.add(
			toObservable(computed(() => ({plan: this.selectedPlan(), ready: this.dataReady()})))
				.subscribe(() => this.renderSelectedPlan()),
		);
	}

	public ngAfterViewInit(): void
	{
		this.renderSelectedPlan();
	}

	public ngOnDestroy(): void
	{
		this.subscription.unsubscribe();
		this.plannerGraph.clear();
		// Destroy runs AFTER the next route's resolver - when the user follows
		// "Open planner" into the shared version, that resolver has already
		// activated it and clearing here would wipe it again. Only clear when
		// actually leaving the version.
		const nextUrl = this.router.getCurrentNavigation()?.finalUrl?.toString() ?? '';
		const version = this.version();
		if (version === null || !nextUrl.startsWith(`/${this.versionManager.urlSlug(version)}`)) {
			this.versionManager.clearActiveVersion();
		}
	}

	public selectPlan(row: ShareTreeRow): void
	{
		if (row.plan !== null) {
			this.selectedPlanSignal.set(row.plan);
		}
	}

	public get selectedDescription(): string
	{
		return this.selectedPlan()?.description ?? '';
	}

	public copyToMyPlans(): void
	{
		const payload = this.payloadSignal();
		if (payload === null || this.ownedVersion() === null || this.copied) {
			return;
		}
		this.shareImport.import(payload);
		this.copied = true;
		this.notifications.showSuccess('Copied to your plans.');
	}

	private renderSelectedPlan(): void
	{
		const container = this.graphContainerRef?.nativeElement;
		const plan = this.selectedPlan();
		if (!container || plan === null || !this.dataReady()) {
			return;
		}

		let data: SharedPlanData = {};
		try {
			data = JSON.parse(plan.data) as SharedPlanData;
		} catch {
			// malformed data - treated as an empty plan below
		}
		this.plannerGraph.readOnly = true;
		if (!data.graph || data.graph.nodes.length === 0) {
			this.plannerGraph.clear();
			return;
		}
		try {
			const graph = this.planSerializer.reviveGraph(data.graph);
			this.plannerGraph.restore(container, graph);
		} catch {
			this.plannerGraph.clear();
		}
	}

}
