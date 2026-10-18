import {Injectable} from '@angular/core';
import {OldProductionData} from '@src/Model/OldTools/OldProductionData';
import {SftContainer} from '@src/Model/PlanFiles/SftContainer';

@Injectable({providedIn: 'root'})
export class SftFileParser
{

	public async parse(content: string): Promise<OldProductionData[]>
	{
		const payload = SftContainer.payload(content);

		if (payload === '') {
			throw new Error('The file contains no data.');
		}
		if (payload.charAt(0) !== SftContainer.oldToolsFormat) {
			throw new Error(`Unsupported export version "${payload.charAt(0)}".`);
		}

		let parsed: {type?: string; tabs?: OldProductionData[]};
		try {
			// The old tools deflated with pako's default (zlib) format, which DecompressionStream('deflate') reads.
			parsed = JSON.parse(await SftContainer.decode(payload)) as typeof parsed;
		} catch {
			throw new Error('The file is not a valid Satisfactory Tools export.');
		}

		if (parsed.type !== 'tabs' || !Array.isArray(parsed.tabs)) {
			throw new Error('The file is not a production line export.');
		}
		return parsed.tabs.filter(tab => !!tab?.metadata && !!tab?.request);
	}

}
