import {MapCoordinateFormatter} from '@src/Model/Map/MapCoordinateFormatter';
import {MapLayerId} from '@src/Model/Map/MapLayerId';
import {MapMarker} from '@src/Model/Map/MapMarker';
import {MapMarkerShapes} from '@src/Model/Map/MapMarkerShapes';

export class MapMarkerPopup
{

	private static readonly SVG = 'http://www.w3.org/2000/svg';

	/** Creatures respawn; everything else on these layers is picked up once. */
	private static readonly COLLECTABLE_LAYERS: ReadonlyArray<MapLayerId> = ['slugs', 'artifacts', 'drives', 'plants', 'items'];

	private readonly numbers = new Intl.NumberFormat('en-US', {maximumFractionDigits: 0});
	private readonly shapes = new MapMarkerShapes();

	/** `toggle` is given when marks can be changed by hand. */
	public build(marker: MapMarker, units: MapCoordinateFormatter, toggle: ((kind: 'taken' | 'collected') => void) | null): HTMLElement
	{
		const root = this.element('div', 'map-popup-body selectable');

		const header = this.element('div', 'map-popup-header');
		header.style.setProperty('--marker-color', marker.color);
		header.append(this.picture(marker));
		const heading = this.element('div', 'map-popup-heading');
		heading.append(this.element('div', 'map-popup-title', marker.title), this.element('div', 'map-popup-description', marker.description));
		header.append(heading);
		root.append(header);

		if (marker.amount !== null) {
			const amount = this.element('div', 'map-popup-amount');
			amount.append(this.element('span', '', 'Amount'), this.element('strong', '', this.numbers.format(marker.amount)));
			root.append(amount);
		}

		if (marker.kind !== 'collectible' && marker.kind !== 'player' && (marker.taken || toggle !== null)) {
			root.append(this.markRow(
				marker.taken ? 'Taken: an extractor is on it' : 'Free',
				marker.taken ? 'Mark as free' : 'Mark as taken',
				toggle === null ? null : () => toggle('taken'),
			));
		}
		if (MapMarkerPopup.COLLECTABLE_LAYERS.includes(marker.layer) && (marker.collected || toggle !== null)) {
			root.append(this.markRow(
				marker.collected ? 'Collected' : 'Not collected yet',
				marker.collected ? 'Mark as not collected' : 'Mark as collected',
				toggle === null ? null : () => toggle('collected'),
			));
		}

		const coordinates = this.element('div', 'map-popup-coordinates');
		for (const [axis, value] of [['X', marker.x], ['Y', marker.y], ['Z', marker.z]] as const) {
			const cell = this.element('div', '');
			cell.append(this.element('span', '', axis), this.element('strong', '', units.format(value)));
			coordinates.append(cell);
		}
		root.append(coordinates);
		if (marker.kind !== 'player') {
			root.append(this.element('code', 'map-popup-id', marker.id));
		}
		return root;
	}

	private markRow(state: string, action: string, toggle: (() => void) | null): HTMLElement
	{
		const row = this.element('div', 'map-popup-taken');
		row.append(this.element('span', '', state));
		if (toggle !== null) {
			const button = this.element('button', 'btn btn-sm btn-outline-light py-0', action) as HTMLButtonElement;
			button.type = 'button';
			button.addEventListener('click', () => toggle());
			row.append(button);
		}
		return row;
	}

	private picture(marker: MapMarker): HTMLElement
	{
		const picture = this.element('div', 'map-popup-picture');
		if (marker.iconUrl !== null) {
			const image = document.createElement('img');
			image.src = marker.iconUrl;
			image.alt = '';
			picture.append(image);
		}
		if (marker.purity !== null) {
			const svg = document.createElementNS(MapMarkerPopup.SVG, 'svg');
			svg.setAttribute('viewBox', '-2 -2 24 24');
			svg.setAttribute('class', marker.iconUrl === null ? 'map-popup-shape' : 'map-popup-badge');
			const path = document.createElementNS(MapMarkerPopup.SVG, 'path');
			path.setAttribute('d', this.shapes.path(marker.purity));
			svg.append(path);
			picture.append(svg);
		}
		return picture;
	}

	private element(tag: string, className: string, text?: string): HTMLElement
	{
		const element = document.createElement(tag);
		element.className = className;
		if (text !== undefined) {
			element.textContent = text;
		}
		return element;
	}

}
