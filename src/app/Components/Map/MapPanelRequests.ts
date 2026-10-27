import {Injectable, Signal, signal} from '@angular/core';
import {MapPanelRequest} from '@src/Components/Map/MapPanelRequest';

/** Kept until a map takes it: the map panel may not exist yet when the request is made. */
@Injectable()
export class MapPanelRequests
{

	private readonly pendingSignal = signal<MapPanelRequest | null>(null);
	public readonly pending: Signal<MapPanelRequest | null> = this.pendingSignal.asReadonly();

	public request(request: MapPanelRequest): void
	{
		this.pendingSignal.set(request);
	}

	public clear(): void
	{
		this.pendingSignal.set(null);
	}

}
