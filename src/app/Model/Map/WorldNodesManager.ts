import {computed, Injectable} from '@angular/core';
import {httpResource} from '@angular/common/http';
import {env} from '@env/env';
import {WorldNodesSchema} from '@src/Model/API/Schema/World/WorldNodesSchema';
import {VersionManager} from '@src/Model/Data/VersionManager';

/** The active version's resource nodes: for the map, and for reading a save against them. */
@Injectable({providedIn: 'root'})
export class WorldNodesManager
{

	public readonly path = computed<string | null>(() => this.versionManager.activeVersionData()?.worldNodesPath ?? null);

	private readonly resource = httpResource<WorldNodesSchema>(() => {
		const path = this.path();
		return path === null ? undefined : `${env.apiUrl}/${path}`;
	});

	public readonly nodes = computed<WorldNodesSchema | null>(() => this.resource.hasValue() ? this.resource.value() : null);

	public constructor(private readonly versionManager: VersionManager)
	{
	}

}
