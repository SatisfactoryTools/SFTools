import {computed, effect, Injectable, signal, untracked} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {HttpErrorResponse} from '@angular/common/http';
import {forkJoin, of} from 'rxjs';
import {catchError, distinctUntilChanged, filter, skip} from 'rxjs/operators';
import {ApiService} from '@src/Model/API/ApiService';
import {Version} from '@src/Model/API/Schema/Version';
import {VersionsApiService} from '@src/Model/API/VersionsApiService';
import {AuthService} from '@src/Model/Auth/AuthService';
import {Data} from '@src/Model/Data/Data';
import {DataTransformer} from '@src/Model/Data/DataTransformer';
import {LocalCustomVersionsService} from '@src/Model/Data/LocalCustomVersionsService';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';

@Injectable({providedIn: 'root'})
export class VersionManager
{

	public constructor(
		private readonly api: ApiService,
		private readonly versionsApi: VersionsApiService,
		private readonly localStore: LocalCustomVersionsService,
		private readonly transformer: DataTransformer,
		private readonly auth: AuthService,
		connectivity: ConnectivityService,
	)
	{
		// What failed while offline reloads by itself once the connection is back.
		toObservable(connectivity.online).pipe(skip(1), filter(online => online)).subscribe(() => {
			if (this.api.versionsResource.error() !== undefined) {
				this.api.versionsResource.reload();
			}
			if (this.api.versionDataResource.error() !== undefined) {
				this.api.versionDataResource.reload();
			}
		});

		// Linked custom versions are per-user, so login/logout must refetch the list.
		toObservable(auth.isAuthenticated).pipe(skip(1), distinctUntilChanged()).subscribe(authenticated => {
			this.createdVersionsSignal.set([]);
			this.localVersionsSignal.set([]);
			if (authenticated) {
				this.adoptLocalVersions();
			} else {
				this.loadLocalVersions();
				this.api.versionsResource.reload();
			}
		});

		if (!auth.isAuthenticated()) {
			this.loadLocalVersions();
		}

		// A failing fetch usually means the prunable file is gone or the dataPath went stale - re-materialize once per (version, path) and retry.
		effect(() => {
			if (this.api.versionDataResource.error() === undefined) {
				return;
			}
			const versionId = untracked(this.activeVersionIdSignal);
			const path = untracked(this.api.versionDataPath);
			if (versionId === null || path === null || this.recoveryAttempts.has(`${versionId}:${path}`)) {
				return;
			}
			this.recoveryAttempts.add(`${versionId}:${path}`);
			this.versionsApi.ensureVersionData(versionId).subscribe({
				next: location => {
					this.dataPathOverridesSignal.update(overrides => new Map(overrides).set(versionId, location.dataPath));
					if (location.dataPath === path) {
						this.api.versionDataResource.reload();
					} else {
						this.api.setVersionDataPath(location.dataPath);
					}
				},
				// The version is gone entirely - leave the resource in its error state.
				error: () => undefined,
			});
		});
	}

	private activeVersionSlugSignal = signal<string | null>(null);
	private activeVersionIdSignal = signal<string | null>(null);

	/** Kept separately so a failed list refresh cannot blank activeVersion while the planner keeps running on already-loaded data. */
	private activeVersionResolvedSignal = signal<Version | null>(null);

	/** So a new version is usable before the list refetch arrives; the resource entry wins once it does. */
	private createdVersionsSignal = signal<Version[]>([]);

	private localVersionsSignal = signal<Version[]>([]);

	private localVersionsLoadedSignal = signal(true);

	/** The stored lists keep the path they were fetched with, which goes stale after re-materialization. */
	private dataPathOverridesSignal = signal<ReadonlyMap<string, string>>(new Map());

	/** So a genuinely broken file cannot retry forever. */
	private readonly recoveryAttempts = new Set<string>();

	public get versionsResource() { return this.api.versionsResource; }
	public get versionDataResource() { return this.api.versionDataResource; }

	public versions = computed(() => {
		// value() throws in the error state, which would abort the template trying to explain the failure.
		const fetched = this.api.versionsResource.hasValue() ? this.api.versionsResource.value() : null;
		const merged = [...fetched ?? []];
		const ids = new Set(merged.map(v => v.id));
		for (const version of [...this.localVersionsSignal(), ...this.createdVersionsSignal()]) {
			if (!ids.has(version.id)) {
				merged.push(version);
				ids.add(version.id);
			}
		}
		const overrides = this.dataPathOverridesSignal();
		return overrides.size === 0
			? merged
			: merged.map(v => overrides.has(v.id) ? {...v, dataPath: overrides.get(v.id)!} : v);
	});

	public ready = computed(() => !this.api.versionsResource.isLoading() && this.localVersionsLoadedSignal());

	public activeVersion = computed(() => {
		const slug = this.activeVersionSlugSignal();
		if (slug === null) {
			return null;
		}
		// The list entry carries the freshest dataPath.
		return this.versions().find(v => this.urlSlug(v) === slug) ?? this.activeVersionResolvedSignal();
	});
	public activeVersionData = computed<Data | null>(() => {
		const file = this.api.versionDataResource.hasValue() ? this.api.versionDataResource.value() : null;
		return file ? this.transformer.transform(file, this.activeVersion()?.worldData?.limits ?? null) : null;
	});

	public urlSlug(version: Version): string
	{
		return version.slug ?? version.id;
	}

	public findByUrlSlug(slugOrId: string): Version | null
	{
		return this.versions().find(v => this.urlSlug(v) === slugOrId) ?? null;
	}

	public defaultPublicVersion(ficsmas: boolean): Version | null
	{
		const publics = this.versions().filter(v => !v.custom);
		const flavour = publics.filter(v => v.ficsmas === ficsmas);
		return flavour.find(v => v.official && !v.experimental)
			?? flavour.find(v => !v.experimental)
			?? flavour[0]
			?? publics[0]
			?? null;
	}

	public setActiveVersion(slugOrId: string): void
	{
		const version = this.findByUrlSlug(slugOrId);
		this.activeVersionSlugSignal.set(slugOrId);
		this.activeVersionIdSignal.set(version?.id ?? null);
		this.activeVersionResolvedSignal.set(version);
		this.api.setVersionDataPath(version?.dataPath ?? null);
	}

	public clearActiveVersion(): void
	{
		this.activeVersionSlugSignal.set(null);
		this.activeVersionIdSignal.set(null);
		this.activeVersionResolvedSignal.set(null);
		this.api.setVersionDataPath(null);
	}

	public registerCreatedVersion(version: Version): void
	{
		if (this.auth.isAuthenticated()) {
			this.createdVersionsSignal.update(created => [...created.filter(v => v.id !== version.id), version]);
			this.api.versionsResource.reload();
			return;
		}
		this.localStore.add(version.id);
		this.localVersionsSignal.update(local => [...local.filter(v => v.id !== version.id), version]);
	}

	public removeCustomVersion(version: Version): void
	{
		this.createdVersionsSignal.update(created => created.filter(v => v.id !== version.id));
		this.localVersionsSignal.update(local => local.filter(v => v.id !== version.id));
		this.localStore.remove(version.id);
		if (this.auth.isAuthenticated()) {
			this.versionsApi.unlinkVersion(version.id).subscribe({
				next: () => this.api.versionsResource.reload(),
				// Refreshing puts it back if the server never got the call - no message needed.
				error: () => this.api.versionsResource.reload(),
			});
		}
	}

	private loadLocalVersions(): void
	{
		const ids = this.localStore.list();
		if (ids.length === 0) {
			this.localVersionsLoadedSignal.set(true);
			return;
		}
		this.localVersionsLoadedSignal.set(false);
		forkJoin(ids.map(id => this.versionsApi.getVersion(id).pipe(
			catchError((err: unknown) => {
				if (err instanceof HttpErrorResponse && err.status === 404) {
					this.localStore.remove(id);
				}
				return of(null);
			}),
		))).subscribe(versions => {
			this.localVersionsSignal.set(versions.filter((v): v is Version => v !== null));
			this.localVersionsLoadedSignal.set(true);
		});
	}

	private adoptLocalVersions(): void
	{
		const ids = this.localStore.list().slice(0, 200);
		if (ids.length === 0) {
			this.api.versionsResource.reload();
			return;
		}
		this.versionsApi.linkVersions(ids).subscribe({
			next: result => {
				[...result.linked, ...result.notFound].forEach(id => this.localStore.remove(id));
				this.api.versionsResource.reload();
			},
			// Linking is idempotent, so it just retries on the next login.
			error: () => this.api.versionsResource.reload(),
		});
	}

}
