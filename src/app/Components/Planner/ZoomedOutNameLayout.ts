import {ZoomedOutName} from '@src/Components/Planner/ZoomedOutName';

/** Estimated, like the rest of the graph's text sizing: x6's own textWrap ignores the font size it is given. */
export class ZoomedOutNameLayout
{

	private static readonly CHAR_WIDTH_EM = 0.64;
	private static readonly LINE_HEIGHT_EM = 1.15;
	private static readonly MAX_LINES = 3;

	public layout(name: string, width: number, height: number, maxFontSize: number): ZoomedOutName
	{
		const words = name.split(/\s+/).filter(word => word !== '');
		let best: ZoomedOutName = {text: name, fontSize: 0};
		for (let lineCount = 1; lineCount <= Math.min(ZoomedOutNameLayout.MAX_LINES, words.length); lineCount++) {
			const lines = this.balancedLines(words, lineCount);
			const longest = Math.max(...lines.map(line => line.length));
			const fontSize = Math.min(
				maxFontSize,
				width / (longest * ZoomedOutNameLayout.CHAR_WIDTH_EM),
				height / (lineCount * ZoomedOutNameLayout.LINE_HEIGHT_EM),
			);
			if (fontSize > best.fontSize) {
				best = {text: lines.join('\n'), fontSize};
			}
		}
		return {text: best.text, fontSize: Math.floor(best.fontSize)};
	}

	public lineHeight(fontSize: number): number
	{
		return Math.round(fontSize * ZoomedOutNameLayout.LINE_HEIGHT_EM);
	}

	private balancedLines(words: string[], lineCount: number): string[]
	{
		if (lineCount === 1) {
			return [words.join(' ')];
		}
		let best: string[] = [];
		let bestLongest = Infinity;
		for (let split = 1; split <= words.length - lineCount + 1; split++) {
			const lines = [words.slice(0, split).join(' '), ...this.balancedLines(words.slice(split), lineCount - 1)];
			const longest = Math.max(...lines.map(line => line.length));
			if (longest < bestLongest) {
				best = lines;
				bestLongest = longest;
			}
		}
		return best;
	}

}
