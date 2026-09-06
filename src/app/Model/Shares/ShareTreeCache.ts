import {Injectable, Signal, computed, signal} from '@angular/core';
import {SharesApiService} from '@src/Model/API/SharesApiService';
import {SharedFolderNode} from '@src/Model/API/Schema/Shares/SharedFolderNode';
import {SharedPlanNode} from '@src/Model/API/Schema/Shares/SharedPlanNode';
import {SharePayload} from '@src/Model/API/Schema/Shares/SharePayload';
import {SharedPlanData} from '@src/Model/Shares/SharedPlanData';
import {ShareTreeNode} from '@src/Model/Shares/ShareTreeNode';

const STORAGE_KEY = 'sftools.shareTrees';
/** More than the visited list can hold, so evictions only hit shares that already left it. */
const CAP = 60;

/**
 * Tree snapshots of shares, so the "Shared plans" list can show every
 * share's plans and subplans without opening it. The visited list itself
 * only carries metadata; the tree comes from the share payload, which is
 * large (it holds every plan's data). Shares are frozen forever, so a
 * snapshot taken from any payload fetch stays valid - it is kept in
 * localStorage per device, and a share visited on another device is fetched
 * once, the first time it is listed here.
 */
@Injectable({providedIn: 'root'})
export class ShareTreeCache
{

	private readonly treesSignal = signal<ReadonlyMap<string, ShareTreeNode>>(this.load());
	public readonly trees: Signal<ReadonlyMap<string, ShareTreeNode>> = this.treesSignal.asReadonly();

	private readonly inFlight = new Set<string>();

	public constructor(private readonly sharesApi: SharesApiService)
	{
	}

	public treeOf(shareId: string): ShareTreeNode | null
	{
		return this.treesSignal().get(shareId) ?? null;
	}

	/** Snapshots the tree of a payload that was fetched anyway (opening, visiting, adding). */
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

	/** Fetches the snapshot of a share this device has never seen; a failure is silent (the row just shows no tree). */
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

	/** Resolved like PlanIconResolver does for a plan: the chosen icon, else the first requested item. */
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
			const raw = localStorage.getItem(STORAGE_KEY);
			return raw === null ? new Map() : new Map(Object.entries(JSON.parse(raw) as Record<string, ShareTreeNode>));
		} catch {
			return new Map();
		}
	}

	private save(trees: ReadonlyMap<string, ShareTreeNode>): void
	{
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(trees)));
		} catch {
			// storage full or unavailable - the snapshot lives in memory for this session only
		}
	}

}
