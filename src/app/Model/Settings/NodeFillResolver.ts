/** Shared by the graph and the Settings previews, so both show the same fill. */
export class NodeFillResolver
{

	// Bold node names stay readable down to 3:1, so white keeps the solid old-tools colours as they were.
	private static readonly WHITE_TEXT_MIN_CONTRAST = 3;

	public static fill(accent: string, strength: number): string
	{
		const clean = accent.replace('#', '');
		const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
		const channel = (offset: number): string => {
			const value = parseInt(full.slice(offset, offset + 2), 16);
			const scaled = Math.round(Math.max(0, Math.min(255, (Number.isNaN(value) ? 0 : value) * strength)));
			return scaled.toString(16).padStart(2, '0');
		};
		return `#${channel(0)}${channel(2)}${channel(4)}`;
	}

	/** Expects the #rrggbb form that fill() returns. */
	public static needsDarkText(fill: string): boolean
	{
		const channel = (offset: number): number => {
			const value = parseInt(fill.slice(offset, offset + 2), 16) / 255;
			return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
		};
		const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
		return 1.05 / (luminance + 0.05) < NodeFillResolver.WHITE_TEXT_MIN_CONTRAST;
	}

}
