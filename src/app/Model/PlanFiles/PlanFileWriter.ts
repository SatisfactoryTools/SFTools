import {Injectable} from '@angular/core';
import {Version} from '@src/Model/API/Schema/Version';
import {PlanFile} from '@src/Model/PlanFiles/PlanFile';
import {PlanFileRoot} from '@src/Model/PlanFiles/PlanFileRoot';
import {SftContainer} from '@src/Model/PlanFiles/SftContainer';
import {PortableFolderNode} from '@src/Model/Shares/PortableFolderNode';
import {PortablePlanNode} from '@src/Model/Shares/PortablePlanNode';

@Injectable({providedIn: 'root'})
export class PlanFileWriter
{

	private static readonly maxContentLines = 40;

	public async write(roots: PlanFileRoot[], version: Version): Promise<string>
	{
		const file: PlanFile = {
			type: 'sftools-plans',
			exportedAt: new Date().toISOString(),
			version: {id: version.id, name: version.name, slug: version.slug ?? null, custom: version.custom},
			roots,
		};
		return SftContainer.encode(SftContainer.planFormat, JSON.stringify(file), this.header(file));
	}

	/** Readable without the app; the old tools print nothing from it, they only reject the format. */
	private header(file: PlanFile): string[]
	{
		const contents: string[] = [];
		file.roots.forEach(root => root.type === 'folder'
			? this.folderLines(root.node as PortableFolderNode, 1, contents)
			: this.planLine(root.node as PortablePlanNode, 1, contents));
		const shown = contents.slice(0, PlanFileWriter.maxContentLines);
		if (contents.length > shown.length) {
			shown.push(`  … and ${contents.length - shown.length} more`);
		}
		return [
			'Satisfactory Tools plans export',
			`Game version: ${this.oneLine(file.version.name)}`,
			`Exported: ${file.exportedAt}`,
			'Contains:',
			...shown,
		];
	}

	private folderLines(node: PortableFolderNode, depth: number, lines: string[]): void
	{
		lines.push(`${'  '.repeat(depth)}Folder: ${this.oneLine(node.name)}`);
		node.children.forEach(child => this.folderLines(child, depth + 1, lines));
		node.plans.forEach(plan => this.planLine(plan, depth + 1, lines));
	}

	private planLine(node: PortablePlanNode, depth: number, lines: string[]): void
	{
		const subplans = this.countSubplans(node);
		const suffix = subplans === 0 ? '' : ` (+${subplans} ${subplans === 1 ? 'subplan' : 'subplans'})`;
		lines.push(`${'  '.repeat(depth)}Plan: ${this.oneLine(node.name) || 'Untitled'}${suffix}`);
	}

	private countSubplans(node: PortablePlanNode): number
	{
		return node.subplans.reduce((sum, subplan) => sum + 1 + this.countSubplans(subplan), 0);
	}

	private oneLine(text: string): string
	{
		return text.replace(/[\r\n]+/g, ' ').trim();
	}

}
