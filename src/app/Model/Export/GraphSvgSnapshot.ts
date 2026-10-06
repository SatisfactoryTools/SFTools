import {ExportBox} from '@src/Model/Export/ExportBox';

/** Taken once when the export window opens: copying the canvas with its styles is the expensive part, so every file and preview is cut from clones of it. */
export class GraphSvgSnapshot
{

	public constructor(
		private readonly svg: SVGSVGElement,
		public readonly contentBox: ExportBox,
		public readonly sampleBox: ExportBox,
	)
	{
	}

	public render(box: ExportBox, background: string | null): string
	{
		const svg = this.svg.cloneNode(true) as SVGSVGElement;
		svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
		svg.setAttribute('width', String(box.width));
		svg.setAttribute('height', String(box.height));
		if (background !== null) {
			const rect = svg.ownerDocument.createElementNS(svg.namespaceURI, 'rect');
			rect.setAttribute('x', String(box.x));
			rect.setAttribute('y', String(box.y));
			rect.setAttribute('width', String(box.width));
			rect.setAttribute('height', String(box.height));
			rect.setAttribute('fill', background);
			const defs = svg.querySelector(':scope > defs');
			if (defs !== null) {
				defs.after(rect);
			} else {
				svg.prepend(rect);
			}
		}
		return new XMLSerializer().serializeToString(svg);
	}

}
