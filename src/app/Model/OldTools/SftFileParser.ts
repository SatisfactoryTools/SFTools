import {Injectable} from '@angular/core';
import {OldProductionData} from '@src/Model/OldTools/OldProductionData';

/**
 * Parses .sft export files of the old Satisfactory Tools. The format is a
 * text file of `#` comment lines plus one data line: a version character
 * ('0') followed by base64-encoded, zlib-deflated JSON of the shape
 * {type: 'tabs', tabs: OldProductionData[]}.
 */
@Injectable({providedIn: 'root'})
export class SftFileParser
{

	private static readonly supportedVersion = '0';

	public async parse(content: string): Promise<OldProductionData[]>
	{
		const payload = content
			.split('\n')
			.map(line => line.trim())
			.filter(line => line !== '' && !line.startsWith('#'))
			.join('');

		if (payload === '') {
			throw new Error('The file contains no data.');
		}
		if (payload.charAt(0) !== SftFileParser.supportedVersion) {
			throw new Error(`Unsupported export version "${payload.charAt(0)}".`);
		}

		let parsed: {type?: string; tabs?: OldProductionData[]};
		try {
			const bytes = Uint8Array.from(atob(payload.substring(1)), char => char.charCodeAt(0));
			parsed = JSON.parse(await this.inflate(bytes)) as typeof parsed;
		} catch {
			throw new Error('The file is not a valid Satisfactory Tools export.');
		}

		if (parsed.type !== 'tabs' || !Array.isArray(parsed.tabs)) {
			throw new Error('The file is not a production line export.');
		}
		return parsed.tabs.filter(tab => !!tab?.metadata && !!tab?.request);
	}

	/** The old tools deflated with pako's default (zlib) format. */
	private async inflate(bytes: Uint8Array): Promise<string>
	{
		const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
		return new Response(stream).text();
	}

}
