/**
 * Decides how many leading tabs of a tab strip fit into the available bar
 * width; the rest collapse into an overflow dropdown. Tabs keep their natural
 * width (no shrinking/truncation), so the input is the measured width of
 * every tab in order.
 */
export class TabOverflowMeasurer
{

	/**
	 * Returns how many leading tabs fit. When not all fit, room for the
	 * overflow button is reserved and at least one tab stays visible.
	 */
	public fit(barWidth: number, tabWidths: number[], overflowButtonWidth: number): number
	{
		if (this.countFitting(barWidth, tabWidths) >= tabWidths.length) {
			return tabWidths.length;
		}
		return Math.max(1, this.countFitting(barWidth - overflowButtonWidth, tabWidths));
	}

	private countFitting(width: number, tabWidths: number[]): number
	{
		let total = 0;
		let count = 0;
		for (const tabWidth of tabWidths) {
			if (total + tabWidth > width) break;
			total += tabWidth;
			count++;
		}
		return count;
	}

}
