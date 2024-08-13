import {Injectable} from '@angular/core';
import {ApiService} from '@src/AppModule/Model/API/ApiService';
import {RequestStatus} from '@src/Utils/RequestStatus';

@Injectable({providedIn: 'root'})
export class VersionManager
{

	private versionListStatus: RequestStatus = RequestStatus.None;

	public constructor(private api: ApiService)
	{
	}

	//public

}
