import {Injectable} from '@angular/core';
import {PlanFile} from '@src/Model/PlanFiles/PlanFile';
import {SftContainer} from '@src/Model/PlanFiles/SftContainer';

@Injectable({providedIn: 'root'})
export class PlanFileReader
{

	public async read(content: string): Promise<PlanFile>
	{
		const payload = SftContainer.payload(content);
		if (payload === '') {
			throw new Error('The file contains no data.');
		}
		if (payload.charAt(0) !== SftContainer.planFormat) {
			throw new Error(`Unsupported export version "${payload.charAt(0)}". The file may come from a newer version of Satisfactory Tools.`);
		}

		let parsed: Partial<PlanFile>;
		try {
			parsed = JSON.parse(await SftContainer.decode(payload)) as Partial<PlanFile>;
		} catch {
			throw new Error('The file is damaged or not a Satisfactory Tools export.');
		}

		if (parsed.type !== 'sftools-plans' || !Array.isArray(parsed.roots) || typeof parsed.version?.id !== 'string') {
			throw new Error('The file is not a plans export.');
		}
		const roots = parsed.roots.filter(root => (root?.type === 'plan' || root?.type === 'folder') && typeof root.node?.id === 'string');
		if (roots.length === 0) {
			throw new Error('The file contains no plans.');
		}
		return {...parsed as PlanFile, roots};
	}

}
