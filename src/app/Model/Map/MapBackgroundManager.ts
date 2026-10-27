import {computed, Injectable} from '@angular/core';
import {httpResource} from '@angular/common/http';
import {env} from '@env/env';
import {MapSchema} from '@src/Model/API/Schema/Map/MapSchema';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {MapBackground} from '@src/Model/Map/MapBackground';
import {MapBackgroundState} from '@src/Model/Map/MapBackgroundState';

@Injectable({providedIn: 'root'})
export class MapBackgroundManager
{

	private readonly mapId = computed<string | null>(() => this.versionManager.activeVersionData()?.mapId ?? null);

	// Keyed by the map id alone, so switching between versions that share a map keeps the loaded one.
	private readonly resource = httpResource<MapSchema>(() => {
		const id = this.mapId();
		return id === null ? undefined : `${this.baseUrl(id)}/map.json`;
	});

	public readonly state = computed<MapBackgroundState>(() => {
		if (this.versionManager.activeVersionData() === null) {
			return 'loading';
		}
		if (this.mapId() === null) {
			return 'missing';
		}
		if (this.resource.error() !== undefined) {
			return 'error';
		}
		return this.resource.hasValue() && this.resource.value().id === this.mapId() ? 'ready' : 'loading';
	});

	public readonly background = computed<MapBackground | null>(() => {
		const id = this.mapId();
		if (id === null || this.state() !== 'ready') {
			return null;
		}
		return new MapBackground(this.resource.value()!, this.baseUrl(id));
	});

	public constructor(private readonly versionManager: VersionManager)
	{
	}

	public retry(): void
	{
		this.resource.reload();
	}

	private baseUrl(id: string): string
	{
		return `${env.apiUrl}/data/maps/${id}`;
	}

}
