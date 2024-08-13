/// <reference lib="webworker" />
import type {HighsSolution} from '@src/Model/Planner/Solver/HighsSolution';
import type {SolverWorkerRequest} from './SolverWorkerRequest';
import type {SolverWorkerResponse} from './SolverWorkerResponse';

type HighsInstance = {solve: (problem: string, opts?: object) => HighsSolution};
type HighsFactory = (opts: {locateFile: (file: string) => string}) => Promise<HighsInstance>;
type SolutionWithRaw = {Columns?: Record<string, {Primal?: number}>; raw?: string};

let highs: HighsInstance | null = null;

// highs.js is CJS and can't be statically or dynamically imported directly.
// Fetch it as text, append an ESM export, then import() via Blob URL - bypasses
// Vite's @fs/ module resolution that blocks in dev mode, and avoids importScripts()
// which module workers don't support.
async function loadHighs(): Promise<HighsInstance>
{
    const base = `${self.location.origin}/assets`;
    const text = await fetch(`${base}/highs.js`).then(r => r.text());
    const blob = new Blob([patchSolutionPrecision(text), '\nexport default Module;'], {type: 'application/javascript'});
    const blobUrl = URL.createObjectURL(blob);
    try {
        const mod = await import(blobUrl) as {default: HighsFactory};
        return mod.default({locateFile: (file: string) => `${base}/${file}`});
    } finally {
        URL.revokeObjectURL(blobUrl);
    }
}

/**
 * highs.js extracts the solution by parsing HiGHS's "pretty" text format,
 * which carries only 6 significant digits - on large flows that quantization
 * unbalances items by whole hundredths per minute and surfaces as phantom
 * supply warnings. Patch its solve() to also write the raw solution file
 * (full precision) and expose the text, so the primals can be restored by
 * restoreFullPrecisionPrimals() after each solve.
 */
function patchSolutionPrecision(source: string): string
{
    const anchorRead = 'const solution=FS.readFile(SOLUTION_FILENAME,{encoding:"utf8"});';
    const anchorParse = 'const output=parseResult(solution.split(/\\r?\\n/),status);';
    if (!source.includes(anchorRead) || !source.includes(anchorParse)) {
        console.warn('highs.js precision patch anchors not found - solver primals stay at 6 significant digits');
        return source;
    }
    return source
        .replace(anchorRead,
            'Module["cwrap"]("Highs_writeSolution","number",["number","string"])(highs,"raw_"+SOLUTION_FILENAME);'
            + 'const rawSolution=FS.readFile("raw_"+SOLUTION_FILENAME,{encoding:"utf8"});'
            + 'FS.unlink("raw_"+SOLUTION_FILENAME);'
            + anchorRead)
        .replace(anchorParse, anchorParse + 'output.raw=rawSolution;');
}

/** Overwrites the parsed 6-digit Primal values with the raw solution's full-precision ones. */
function restoreFullPrecisionPrimals(solution: SolutionWithRaw): void
{
    const raw = solution.raw;
    delete solution.raw;
    if (!raw || !solution.Columns) {
        return;
    }

    const lines = raw.split(/\r?\n/);
    const primalStart = lines.findIndex(line => line.startsWith('# Primal solution values'));
    if (primalStart === -1) {
        return;
    }
    const header = lines.findIndex((line, index) => index > primalStart && line.startsWith('# Columns'));
    if (header === -1) {
        return;
    }

    const count = parseInt(lines[header].slice('# Columns'.length), 10);
    for (let i = header + 1; i <= header + count && i < lines.length; i++) {
        const parts = lines[i].split(/\s+/);
        if (parts.length !== 2) {
            continue;
        }
        const column = solution.Columns[parts[0]];
        const value = parseFloat(parts[1]);
        if (column && isFinite(value)) {
            column.Primal = value;
        }
    }
}

addEventListener('message', async ({data}: MessageEvent<SolverWorkerRequest>) => {
    const {id, problem, options} = data;
    try {
        if (highs === null) {
            highs = await loadHighs();
        }
        const solution = highs.solve(problem, {
            presolve: 'on',
            mip_heuristic_effort: 0.3,
            mip_detect_symmetry: true,
            mip_rel_gap: options?.mipRelGap ?? 0.05,
            small_matrix_value: 1e-7,
            primal_feasibility_tolerance: 1e-9,
            dual_feasibility_tolerance: 1e-9,
        });
        restoreFullPrecisionPrimals(solution as SolutionWithRaw);
        postMessage({id, solution, error: null} satisfies SolverWorkerResponse);
    } catch (e) {
        postMessage({id, solution: null, error: String(e)} satisfies SolverWorkerResponse);
    }
});
