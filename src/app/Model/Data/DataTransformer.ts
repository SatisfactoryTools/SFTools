import {Injectable} from '@angular/core';
import {VersionFile} from '@src/Model/API/Schema/VersionFile';
import {Data} from '@src/Model/Data/Data';

@Injectable({providedIn: 'root'})
export class DataTransformer
{

	public transform(file: VersionFile): Data
	{
		return new Data(file.data, file.metadata);
	}

}
