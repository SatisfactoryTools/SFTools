import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {MapMarkerShape} from '@src/Model/Map/MapMarkerShape';
import {MapMarkerShapes} from '@src/Model/Map/MapMarkerShapes';

@Component({
	selector: 'map-marker-swatch',
	template: `
		<svg width="14" height="14" viewBox="-1.5 -1.5 23 23" aria-hidden="true">
			<path [attr.d]="path" fill="none" stroke="#111" stroke-width="3.2" stroke-linejoin="round"/>
			<path [attr.d]="path" [attr.fill]="color" stroke="rgba(255,255,255,0.9)" stroke-width="1.1" stroke-linejoin="round"/>
		</svg>
	`,
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: `
		:host {
			display: inline-flex;
			flex: none;
		}
	`,
})
export class MapMarkerSwatchComponent
{

	@Input({required: true}) public shape!: MapMarkerShape;
	@Input({required: true}) public color!: string;

	private readonly shapes = new MapMarkerShapes();

	public get path(): string
	{
		return this.shapes.path(this.shape);
	}

}
