export interface ShareTreeNode
{
	readonly id: string;
	readonly kind: 'folder' | 'plan';
	readonly name: string;
	readonly iconClassName: string | null;
	readonly children: ShareTreeNode[];
}
