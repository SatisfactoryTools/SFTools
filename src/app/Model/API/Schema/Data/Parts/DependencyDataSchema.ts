import {GamePhase} from '@src/Model/API/Schema/Data/Parts/GamePhase';

export interface DependencyDataSchema
{

	schematics: string[];
	gamePhase: GamePhase | null;
	requireAll: boolean;

}
