import {HighsSolution} from '@src/Model/Planner/Solver/HighsSolution';

/**
 * The LP format takes only some characters in names, and "-" is the minus operator: a mod recipe like
 * "Recipe_SuperRe-RefinedOil_C" became two variables, one of them negatively priced and unbounded.
 * Names are encoded per problem and the solution's column names mapped back exactly.
 */
export class LpNameEncoder
{

	private static readonly UNSAFE = /[^A-Za-z0-9_@#%.]/g;

	private readonly originals = new Map<string, string>();

	public encode(problem: string): string
	{
		return problem.split('\n').map(line => line.startsWith('\\') ? line : line.replace(/\S+/g, token => this.encodeToken(token))).join('\n');
	}

	public decode(solution: HighsSolution): HighsSolution
	{
		if (this.originals.size === 0) {
			return solution;
		}
		const columns: Record<string, unknown> = {};
		for (const [name, column] of Object.entries(solution.Columns as Record<string, {Name?: string}>)) {
			const original = this.originals.get(name) ?? name;
			columns[original] = column.Name !== undefined ? {...column, Name: this.originals.get(column.Name) ?? column.Name} : column;
		}
		return {...solution, Columns: columns} as HighsSolution;
	}

	private encodeToken(token: string): string
	{
		// Numbers, operators and keywords stay; a name starts with a letter or an underscore.
		if (!/^[A-Za-z_]/.test(token)) {
			return token;
		}
		const label = token.endsWith(':') ? ':' : '';
		const name = label !== '' ? token.slice(0, -1) : token;
		LpNameEncoder.UNSAFE.lastIndex = 0;
		if (!LpNameEncoder.UNSAFE.test(name)) {
			return token;
		}
		const encoded = name.replace(LpNameEncoder.UNSAFE, char => `__U${char.codePointAt(0)!.toString(16)}__`);
		this.originals.set(encoded, name);
		return encoded + label;
	}

}
