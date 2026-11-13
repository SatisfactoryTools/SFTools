import {ModSuggestionStatus} from '@src/Model/API/Schema/Mods/ModSuggestionStatus';

export interface ModSuggestionResult
{

	status: ModSuggestionStatus;
	reference: string;
	name?: string;

}
