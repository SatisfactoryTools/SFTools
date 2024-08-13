import {DependencyDataSchema} from '@src/Model/API/Schema/Data/Parts/DependencyDataSchema';
import {GamePhase} from '@src/Model/API/Schema/Data/Parts/GamePhase';
import {Schematic} from '@src/Model/Data/Entities/Schematic';

export class DependencyData
{

	public readonly gamePhase: GamePhase | null;
	public readonly requireAll: boolean;

	private readonly rawSchematics: string[];
	private readonly schematicMap: Map<string, Schematic>;
	private cachedSchematics: Schematic[] | null = null;

	public get schematics(): Schematic[]
	{
		return this.cachedSchematics ??= this.rawSchematics.map(cn => this.schematicMap.get(cn)!);
	}

	public constructor(schema: DependencyDataSchema, schematicMap: Map<string, Schematic>)
	{
		this.gamePhase = schema.gamePhase;
		this.requireAll = schema.requireAll;
		this.rawSchematics = schema.schematics;
		this.schematicMap = schematicMap;
	}

}
