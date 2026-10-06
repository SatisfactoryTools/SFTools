import {Injectable, Signal, WritableSignal, computed, signal} from '@angular/core';
import {SharesApiService} from '@src/Model/API/SharesApiService';
import {SharedFolderNode} from '@src/Model/API/Schema/Shares/SharedFolderNode';
import {SharedPlanNode} from '@src/Model/API/Schema/Shares/SharedPlanNode';
import {SharePayload} from '@src/Model/API/Schema/Shares/SharePayload';
import {SharedPlanData} from '@src/Model/Shares/SharedPlanData';
import {ShareTreeNode} from '@src/Model/Shares/ShareTreeNode';
import {AppStorage} from '@src/Model/Storage/AppStorage';

const STORAGE_KEY = 'sftools.shareTrees';
/** More than the visited list can hold, so evictions only hit shares that already left it. */
const CAP = 60;

@Injectable({providedIn: 'root'})
export class ShareTreeCache
{

	private readonly treesSignal: WritableSignal<ReadonlyMap<string, ShareTreeNode>>;
	public readonly trees: Signal<ReadonlyMap<string, ShareTreeNode>>;

	private readonly inFlight = new Set<string>();

	public constructor(
		private readonly sharesApi: SharesApiService,
		private readonly storage: AppStorage,
	)
	{
		this.treesSignal = signal(this.load());
		this.trees = this.treesSignal.asReadonly();
	}

	public treeOf(shareId: string): ShareTreeNode | null
	{
		return this.treesSignal().get(shareId) ?? null;
	}

	public record(payload: SharePayload): void
	{
		if (this.treesSignal().has(payload.share)) {
			return;
		}
		const next = new Map(this.treesSignal());
		next.set(payload.share, this.buildTree(payload));
		while (next.size > CAP) {
			next.delete(next.keys().next().value!);
		}
		this.treesSignal.set(next);
		this.save(next);
	}

	public ensure(shareId: string): void
	{
		if (this.treesSignal().has(shareId) || this.inFlight.has(shareId)) {
			return;
		}
		this.inFlight.add(shareId);
		this.sharesApi.getShare(shareId).subscribe({
			next: payload => {
				this.inFlight.delete(shareId);
				this.record(payload);
			},
			error: () => this.inFlight.delete(shareId),
		});
	}

	public buildTree(payload: SharePayload): ShareTreeNode
	{
		return payload.type === 'folder'
			? this.folderNode(payload.root as SharedFolderNode)
			: this.planNode(payload.root as SharedPlanNode);
	}

	private folderNode(node: SharedFolderNode): ShareTreeNode
	{
		return {
			id: node.id,
			kind: 'folder',
			name: node.name,
			iconClassName: null,
			children: [...node.children.map(child => this.folderNode(child)), ...node.plans.map(plan => this.planNode(plan))],
		};
	}

	private planNode(node: SharedPlanNode): ShareTreeNode
	{
		return {
			id: node.id,
			kind: 'plan',
			name: node.name,
			iconClassName: this.iconClassNameOf(node),
			children: node.subplans.map(sub => this.planNode(sub)),
		};
	}

	private iconClassNameOf(node: SharedPlanNode): string | null
	{
		try {
			const data = JSON.parse(node.data) as SharedPlanData;
			if (data.iconClassName !== undefined) {
				return data.iconClassName;
			}
			return data.requests?.[0]?.itemClassName ?? null;
		} catch {
			return null;
		}
	}

	private load(): Map<string, ShareTreeNode>
	{
		try {
			const raw = this.storage.getItem(STORAGE_KEY);
			return raw === null ? new Map() : new Map(Object.entries(JSON.parse(raw) as Record<string, ShareTreeNode>));
		} catch {
			return new Map();
		}
	}

	private save(trees: ReadonlyMap<string, ShareTreeNode>): void
	{
		try {
			this.storage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(trees)));
		} catch {
			// storage full or unavailable - the snapshot lives in memory for this session only
		}
	}

}
