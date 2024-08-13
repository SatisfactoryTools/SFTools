export interface FloatingGroup
{
	readonly id: string;
	readonly tabIds: string[];
	readonly activeTabId: string;
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}
