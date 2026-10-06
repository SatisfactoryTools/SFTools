/**
 * Mirrors tools-api app/Model/Services/Meta/MetaText.php and shares its fixtures (meta-text-fixtures.json,
 * `npm run test:meta-text`): keep them in sync. Code points are counted, not UTF-16 units, to match PHP mb_ functions.
 */
export class MetaText
{

	public static readonly SITE_NAME = 'Satisfactory Tools';
	public static readonly TITLE_SUFFIX = ' · ' + MetaText.SITE_NAME;
	public static readonly DESCRIPTION_MAX_LENGTH = 200;

	public static readonly DEFAULT_DESCRIPTION = 'Plan factories that actually work. An optimising production and logistics planner for Satisfactory, supporting every factory - from the first smelter to a 1 TW nuclear grid. Includes a searchable codex, custom versions and mods.';

	/** Tag-like markup only (`<b>`, `</color>`, `<img src=…/>`), so a bare "<" in text survives. */
	private static readonly TAG_PATTERN = /<\/?[A-Za-z][^<>]*>/gu;

	public static title(title: string): string
	{
		const collapsed = MetaText.collapse(title);
		return collapsed === '' ? MetaText.SITE_NAME : collapsed + MetaText.TITLE_SUFFIX;
	}

	public static description(text: string): string
	{
		const collapsed = MetaText.collapse(text.replace(MetaText.TAG_PATTERN, ' '));
		const characters = Array.from(collapsed);
		if (characters.length <= MetaText.DESCRIPTION_MAX_LENGTH) {
			return collapsed;
		}

		let cut = characters.slice(0, MetaText.DESCRIPTION_MAX_LENGTH - 1).join('');
		const space = cut.lastIndexOf(' ');
		// A single overlong word is cut mid-word rather than dropped whole.
		if (space > 0) {
			cut = cut.slice(0, space);
		}
		return cut.replace(/[\s,.;:–-]+$/u, '') + '…';
	}

	private static collapse(text: string): string
	{
		return text.replace(/\s+/gu, ' ').trim();
	}

}
