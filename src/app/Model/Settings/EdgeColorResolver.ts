export class EdgeColorResolver
{

	public static readonly DEFAULT_COLOR = '#5c718a';

	// Hand-picked for the default colour; other colours are lightened towards white instead.
	private static readonly DEFAULT_HOVER = '#91acc6';

	private static readonly HOVER_LIGHTEN = 0.4;

	public static hover(color: string): string
	{
		if (color.toLowerCase() === EdgeColorResolver.DEFAULT_COLOR) {
			return EdgeColorResolver.DEFAULT_HOVER;
		}
		const clean = color.replace('#', '');
		const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
		const channel = (offset: number): string => {
			const value = parseInt(full.slice(offset, offset + 2), 16);
			const base = Number.isNaN(value) ? 0 : value;
			return Math.round(base + (255 - base) * EdgeColorResolver.HOVER_LIGHTEN).toString(16).padStart(2, '0');
		};
		return `#${channel(0)}${channel(2)}${channel(4)}`;
	}

}
