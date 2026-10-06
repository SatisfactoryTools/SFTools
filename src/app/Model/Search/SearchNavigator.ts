import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {SearchResult} from '@src/Model/Search/SearchResult';
import {SearchResultType} from '@src/Model/Search/SearchResultType';

@Injectable({providedIn: 'root'})
export class SearchNavigator
{

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly planManager: PlanManager,
		private readonly router: Router,
	)
	{
	}

	public open(result: SearchResult): void
	{
		// Help is about the tool, not a game version, so it opens without an active version.
		if (result.type === 'article') {
			const [slug, anchor] = result.id.split('#');
			void this.router.navigate(['/', 'help', slug], {fragment: anchor});
			return;
		}

		const version = this.versionManager.activeVersion();
		if (version === null) {
			return;
		}
		const slug = this.versionManager.urlSlug(version);

		switch (result.type) {
			case 'plan':
				void this.router.navigate(['/', slug, 'planner', result.id]);
				return;
			case 'folder':
				// Folder selection has no URL state, so it is set in the store after navigating.
				void this.router.navigate(['/', slug, 'planner'])
					.then(() => this.planManager.setActiveFolder(result.id));
				return;
			default:
				void this.router.navigate(['/', slug, 'codex', this.codexSection(result.type), result.id]);
		}
	}

	private codexSection(type: SearchResultType): string
	{
		switch (type) {
			case 'item': return 'items';
			case 'recipe': return 'recipes';
			case 'building': return 'buildings';
			default: return 'schematics';
		}
	}

}
