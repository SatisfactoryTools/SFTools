import {Injectable} from '@angular/core';
import {VersionFile} from '@src/Model/API/Schema/VersionFile';
import {Data} from '@src/Model/Data/Data';

@Injectable({providedIn: 'root'})
export class DataTransformer
{

	/** Official versions' data files carry no limits; their caps live only on the version record's worldData. */
	public transform(file: VersionFile, fallbackWorldLimits: Record<string, number> | null = null): Data
	{
		return new Data(file.data, file.metadata, fallbackWorldLimits);
	}

}
