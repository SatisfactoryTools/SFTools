/**
 * The .sft layout shared by the old tools (format "0") and this app (format "1"):
 * `#` comment lines, then the format character followed by base64 of zlib-deflated JSON.
 * The old tools reject any other format character, so a new format fails cleanly there.
 */
export class SftContainer
{

	public static readonly oldToolsFormat = '0';
	public static readonly planFormat = '1';

	public static payload(content: string): string
	{
		return content
			.split('\n')
			.map(line => line.trim())
			.filter(line => line !== '' && !line.startsWith('#'))
			.join('');
	}

	public static format(content: string): string | null
	{
		const payload = SftContainer.payload(content);
		return payload === '' ? null : payload.charAt(0);
	}

	public static async decode(payload: string): Promise<string>
	{
		const bytes = Uint8Array.from(atob(payload.substring(1)), char => char.charCodeAt(0));
		const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
		return new Response(stream).text();
	}

	public static async encode(format: string, json: string, header: string[]): Promise<string>
	{
		const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate'));
		const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
		let binary = '';
		// Chunked: spreading a large array into fromCharCode overflows the call stack.
		for (let offset = 0; offset < bytes.length; offset += 0x8000) {
			binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
		}
		return header.map(line => `# ${line}`).join('\n') + '\n\n' + format + btoa(binary) + '\n';
	}

}
