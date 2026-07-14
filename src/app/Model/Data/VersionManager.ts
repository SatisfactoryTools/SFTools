import {computed, effect, Injectable, signal, untracked} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {HttpErrorResponse} from '@angular/common/http';
import {forkJoin, of} from 'rxjs';
import {catchError, distinctUntilChanged, skip} from 'rxjs/operators';
import {ApiService} from '@src/Model/API/ApiService';
import {Version} from '@src/Model/API/Schema/Version';
import {VersionsApiService} from '@src/Model/API/VersionsApiService';
import {AuthService} from '@src/Model/Auth/AuthService';
import {Data} from '@src/Model/Data/Data';
import {DataTransformer} from '@src/Model/Data/DataTransformer';
import {LocalCustomVersionsService} from '@src/Model/Data/LocalCustomVersionsService';

@Injectable({providedIn: 'root'})
export class VersionManager
{

	public constructor(
		private readonly api: ApiService,
		private readonly versionsApi: VersionsApiService,
		private readonly localStore: LocalCustomVersionsService,
		private readonly transformer: DataTransformer,
		private readonly auth: AuthService,
	)
	{
		// The version list depends on who asks (linked custom versions are
		// per-user), so login/logout must refetch it - otherwise a signed-out
		// user keeps seeing their custom versions until a full page reload.
		// Logging in additionally adopts the anonymous localStorage versions
		// into the account.
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

		// Data files are prunable cache artifacts - a failing fetch usually
		// means the file is gone (or the dataPath went stale). Re-materialize
		// it once per (version, path) and retry with the returned path.
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

	/**
	 * Versions created this session while signed in, available immediately -
	 * the canonical list only refreshes when the versions resource reloads.
	 * Merged by id, with the resource's entry winning once it arrives.
	 */
	private createdVersionsSignal = signal<Version[]>([]);

	/** The anonymous user's custom versions, resolved from the localStorage id list via GET /versions/{id}. */
	private localVersionsSignal = signal<Version[]>([]);

	/** False while the localStorage versions are still being fetched - the versions resolver waits for it. */
	private localVersionsLoadedSignal = signal(true);

	/**
	 * dataPath corrections learned from ensure calls - the stored lists keep
	 * the path they were fetched with, which goes stale when a version is
	 * re-materialized with changed inputs.
	 */
	private dataPathOverridesSignal = signal<ReadonlyMap<string, string>>(new Map());

	/** (versionId:path) pairs already re-materialized, so a genuinely broken file cannot retry forever. */
	private readonly recoveryAttempts = new Set<string>();

	public get versionsResource() { return this.api.versionsResource; }
	public get versionDataResource() { return this.api.versionDataResource; }

	public versions = computed(() => {
		const merged = [...this.api.versionsResource.value() ?? []];
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

	/** True once the version list - including the anonymous localStorage versions - is usable. */
	public ready = computed(() => !this.api.versionsResource.isLoading() && this.localVersionsLoadedSignal());

	public activeVersion = computed(() =>
		this.versions().find(v => this.urlSlug(v) === this.activeVersionSlugSignal()) ?? null,
	);
	public activeVersionData = computed<Data | null>(() => {
		const file = this.api.versionDataResource.value();
		return file ? this.transformer.transform(file) : null;
	});

	/** The URL segment addressing a version: its slug, or its id for custom versions without one. */
	public urlSlug(version: Version): string
	{
		return version.slug ?? version.id;
	}

	public findByUrlSlug(slugOrId: string): Version | null
	{
		return this.versions().find(v => this.urlSlug(v) === slugOrId) ?? null;
	}

	public setActiveVersion(slugOrId: string): void
	{
		const version = this.findByUrlSlug(slugOrId);
		this.activeVersionSlugSignal.set(slugOrId);
		this.activeVersionIdSignal.set(version?.id ?? null);
		this.api.setVersionDataPath(version?.dataPath ?? null);
	}

	/**
	 * Activates a version that is not in the viewer's own list (e.g. another
	 * user's custom version behind a share link). The data path comes from the
	 * given version directly since findByUrlSlug cannot resolve it; activeVersion
	 * stays null because the version is deliberately kept out of versions().
	 */
	public setActiveExternalVersion(version: Version): void
	{
		this.activeVersionSlugSignal.set(this.urlSlug(version));
		this.activeVersionIdSignal.set(version.id);
		this.api.setVersionDataPath(version.dataPath);
	}

	public clearActiveVersion(): void
	{
		this.activeVersionSlugSignal.set(null);
		this.activeVersionIdSignal.set(null);
		this.api.setVersionDataPath(null);
	}

	/**
	 * Makes a just-created version usable right away. Signed in, the server
	 * linked it to the account, so the canonical list refreshes in the
	 * background; anonymous, ownership is only the localStorage id list.
	 */
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

	/**
	 * Removes the version from the user's list - the account link when signed
	 * in, the localStorage entry otherwise. The version itself keeps existing
	 * (it is shared and deduplicated); creating the same definition again
	 * brings it back.
	 */
	public removeCustomVersion(version: Version): void
	{
		this.createdVersionsSignal.update(created => created.filter(v => v.id !== version.id));
		this.localVersionsSignal.update(local => local.filter(v => v.id !== version.id));
		this.localStore.remove(version.id);
		if (this.auth.isAuthenticated()) {
			this.versionsApi.unlinkVersion(version.id).subscribe(() => this.api.versionsResource.reload());
		}
	}

	/** Resolves the anonymous localStorage versions; ids the server no longer knows are dropped from the store. */
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

	/**
	 * Adopts the anonymous localStorage versions into the just-signed-in
	 * account, then refreshes the canonical list (which now includes them).
	 * Linked ids leave localStorage - keeping them would only grow stale;
	 * notFound ids are dead and leave too.
	 */
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
