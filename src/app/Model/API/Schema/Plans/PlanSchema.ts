export interface PlanSchema
{
	readonly id: string;
	readonly name: string;
	readonly description: string | null;
	readonly version: string;
	readonly folder: string | null;
	readonly parent: string | null;
	readonly data: string;
	readonly createdAt: string;
	readonly revision: number;
	readonly linkAccess: boolean;
	readonly subplans?: PlanSchema[];
}
