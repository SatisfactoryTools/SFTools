import {Injectable} from '@angular/core';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

/** Icons are embedded as data URIs later and a plan draws the same icon dozens of times; without this an export repeats every one in full. */
@Injectable({providedIn: 'root'})
export class SvgIconDeduplicator
{

	public apply(svg: SVGSVGElement): void
	{
		const document = svg.ownerDocument;
		const symbolIds = new Map<string, string>();
		let defs = svg.querySelector(':scope > defs');
		if (defs === null) {
			defs = document.createElementNS(svg.namespaceURI, 'defs');
			svg.prepend(defs);
		}

		svg.querySelectorAll('image').forEach(image => {
			if (image.closest('defs') !== null) {
				return;
			}
			const href = image.getAttributeNS(XLINK_NS, 'href') ?? image.getAttribute('href') ?? '';
			if (href === '' || image.getAttribute('display') === 'none' || image.style.display === 'none') {
				image.remove();
				return;
			}

			let symbolId = symbolIds.get(href);
			if (symbolId === undefined) {
				symbolId = `icon-${symbolIds.size + 1}`;
				symbolIds.set(href, symbolId);
				defs!.appendChild(this.createSymbol(svg, symbolId, href));
			}

			const use = document.createElementNS(svg.namespaceURI, 'use');
			use.setAttributeNS(XLINK_NS, 'xlink:href', `#${symbolId}`);
			['x', 'y', 'width', 'height', 'transform', 'class', 'style', 'opacity'].forEach(name => {
				const value = image.getAttribute(name);
				if (value !== null && value !== '') {
					use.setAttribute(name, value);
				}
			});
			image.replaceWith(use);
		});
	}

	/** A unit-square symbol scaled by the <use>, so the symbol need not know the image pixel size. */
	private createSymbol(svg: SVGSVGElement, id: string, href: string): Element
	{
		const document = svg.ownerDocument;
		const symbol = document.createElementNS(svg.namespaceURI, 'symbol');
		symbol.setAttribute('id', id);
		symbol.setAttribute('viewBox', '0 0 1 1');
		const image = document.createElementNS(svg.namespaceURI, 'image');
		image.setAttribute('width', '1');
		image.setAttribute('height', '1');
		image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		image.setAttributeNS(XLINK_NS, 'xlink:href', href);
		symbol.appendChild(image);
		return symbol;
	}

}
