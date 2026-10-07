import {Injectable} from '@angular/core';
import {IconUrlService} from '@src/Model/Data/IconUrlService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PageMeta} from '@src/Model/Meta/PageMeta';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanIconResolver} from '@src/Model/Planner/PlanIconResolver';

/** Mirrors the API MetaResolver::planLink(): keep them in sync. */
@Injectable({providedIn: 'root'})
export class PlanMetaResolver
{

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly planIcons: PlanIconResolver,
		private readonly iconUrls: IconUrlService,
	)
	{
	}

	public resolve(plan: Plan): PageMeta
	{
		const version = this.versionManager.activeVersion()?.name ?? '';
		return {
			title: plan.name,
			description: plan.description.trim() !== '' ? plan.description : `Production plan for Satisfactory (${version}).`,
			image: this.iconUrls.url(this.planIcons.iconHash(plan), 256),
		};
	}

}
