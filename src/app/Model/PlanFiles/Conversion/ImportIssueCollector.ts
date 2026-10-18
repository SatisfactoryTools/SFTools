import {ImportIssue} from '@src/Model/PlanFiles/Conversion/ImportIssue';
import {ImportIssueLevel} from '@src/Model/PlanFiles/Conversion/ImportIssueLevel';

/** Identical texts merge into one counted line, so ten nodes of a removed recipe read as one issue. */
export class ImportIssueCollector
{

	private readonly entries = new Map<string, {level: ImportIssueLevel; count: number}>();

	public warn(text: string): void
	{
		this.add('warning', text);
	}

	public info(text: string): void
	{
		this.add('info', text);
	}

	public hasWarnings(): boolean
	{
		return [...this.entries.values()].some(entry => entry.level === 'warning');
	}

	public issues(): ImportIssue[]
	{
		return [...this.entries.entries()]
			.map(([text, entry]) => ({level: entry.level, text, count: entry.count}))
			.sort((a, b) => (a.level === b.level ? 0 : a.level === 'warning' ? -1 : 1));
	}

	private add(level: ImportIssueLevel, text: string): void
	{
		const entry = this.entries.get(text);
		if (entry) {
			entry.count++;
		} else {
			this.entries.set(text, {level, count: 1});
		}
	}

}
