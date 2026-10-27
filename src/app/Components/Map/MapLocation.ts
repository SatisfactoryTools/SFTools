import {Injectable, OnDestroy, Signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Params, Router} from '@angular/router';
import {Subject, Subscription} from 'rxjs';
import {debounceTime, map} from 'rxjs/operators';
import {MapLocationParams} from '@src/Components/Map/MapLocationParams';
import {MapLayerCodec} from '@src/Model/Map/MapLayerCodec';
import {MapLayerState} from '@src/Model/Map/MapLayerState';
import {MapView} from '@src/Model/Map/MapView';

@Injectable()
export abstract class MapLocation implements OnDestroy
{

	private static readonly WRITE_DELAY_MS = 400;

	public readonly view: Signal<MapView | null>;
	public readonly layers: Signal<MapLayerState>;

	private readonly codec = new MapLayerCodec();
	private readonly writes = new Subject<MapView>();
	private readonly subscription: Subscription;

	protected constructor(
		private readonly router: Router,
		private readonly route: ActivatedRoute,
		public readonly params: MapLocationParams,
	)
	{
		this.view = toSignal(
			route.queryParamMap.pipe(map(query => MapView.parse(query.get(params.view)))),
			{initialValue: MapView.parse(route.snapshot.queryParamMap.get(params.view)), equal: (a, b) => a === b || (a !== null && a.equals(b))},
		);
		this.layers = toSignal(
			route.queryParamMap.pipe(map(query => this.codec.decode(query.get(params.layers)))),
			{
				initialValue: this.codec.decode(route.snapshot.queryParamMap.get(params.layers)),
				// Every view write emits new query params; the markers must not rebuild for those.
				equal: (a, b) => a.equals(b),
			},
		);
		// Panning ends many times a second while dragging; the URL only needs where it settled.
		this.subscription = this.writes.pipe(debounceTime(MapLocation.WRITE_DELAY_MS)).subscribe(view => {
			if (view.equals(MapView.parse(this.route.snapshot.queryParamMap.get(this.params.view)))) {
				return;
			}
			this.write({[this.params.view]: view.toString()});
		});
	}

	public setView(view: MapView): void
	{
		this.writes.next(view);
	}

	public setLayers(state: MapLayerState): void
	{
		this.write({[this.params.layers]: this.codec.encode(state)});
	}

	public queryParams(target: MapLocationParams): Params
	{
		return {
			[target.view]: this.view()?.toString() ?? null,
			[target.layers]: this.codec.encode(this.layers()),
		};
	}

	// A write still waiting when the map closes would navigate back to the page it was on.
	public ngOnDestroy(): void
	{
		this.subscription.unsubscribe();
	}

	private write(queryParams: Params): void
	{
		void this.router.navigate([], {
			relativeTo: this.route,
			queryParams,
			queryParamsHandling: 'merge',
			replaceUrl: true,
		});
	}

}
