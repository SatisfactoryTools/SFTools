/** "2 hours ago"-style wording for timestamps, coarse on purpose. */
export class RelativeTimeFormatter
{

	public static ago(iso: string, now: number = Date.now()): string
	{
		const then = Date.parse(iso);
		if (Number.isNaN(then)) {
			return '';
		}
		const seconds = Math.max(0, Math.round((now - then) / 1000));
		const minutes = Math.round(seconds / 60);
		const hours = Math.round(minutes / 60);
		const days = Math.round(hours / 24);

		if (seconds < 60) {
			return 'just now';
		}
		if (minutes < 60) {
			return RelativeTimeFormatter.plural(minutes, 'minute');
		}
		if (hours < 24) {
			return RelativeTimeFormatter.plural(hours, 'hour');
		}
		if (days === 1) {
			return 'yesterday';
		}
		if (days < 7) {
			return RelativeTimeFormatter.plural(days, 'day');
		}
		if (days < 30) {
			return RelativeTimeFormatter.plural(Math.round(days / 7), 'week');
		}
		if (days < 365) {
			return RelativeTimeFormatter.plural(Math.round(days / 30), 'month');
		}
		return RelativeTimeFormatter.plural(Math.round(days / 365), 'year');
	}

	private static plural(count: number, unit: string): string
	{
		return `${count} ${unit}${count === 1 ? '' : 's'} ago`;
	}

}
