export class TabOverflowMeasurer
{

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
