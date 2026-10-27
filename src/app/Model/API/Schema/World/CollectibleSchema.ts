export interface CollectibleSchema
{
	name: string;
	class: string;
	creature?: string;
	item?: string;
	amount?: number;
	location: [number, number, number];
}
