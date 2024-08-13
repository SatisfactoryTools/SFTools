import {computed, Injectable, signal} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {distinctUntilChanged, skip} from 'rxjs/operators';
import {ApiService} from '@src/Model/API/ApiService';
import {Version} from '@src/Model/API/Schema/Version';
import {AuthService} from '@src/Model/Auth/AuthService';
import {Data} from '@src/Model/Data/Data';
import {DataTransformer} from '@src/Model/Data/DataTransformer';

@Injectable({providedIn: 'root'})
export class VersionManager
{

	public constructor(
		private readonly api: ApiService,
		private readonly transformer: DataTransformer,
		auth: AuthService,
	)
	{
		// The version list depends on who asks (custom versions are per-user),
		// so login/logout must refetch it - otherwise a signed-out user keeps
		// seeing their custom versions until a full page reload.
		toObservable(auth.isAuthenticated).pipe(skip(1), distinctUntilChanged()).subscribe(() => {
			this.createdVersionsSignal.set([]);
			this.api.versionsResource.reload();
		});
	}

	private activeVersionSlugSignal = signal<string | null>(null);

	/**
	 * Versions created this session, available immediately - the canonical
	 * list only refreshes when the versions resource reloads. Merged by id,
	 * with the resource's entry winning once it arrives.
	 */
	private createdVersionsSignal = signal<Version[]>([]);

	public get versionsResource() { return this.api.versionsResource; }
	public get versionDataResource() { return this.api.versionDataResource; }

	public versions = computed(() => {
		const listed = this.api.versionsResource.value() ?? [];
		const listedIds = new Set(listed.map(v => v.id));
		return [...listed, ...this.createdVersionsSignal().filter(v => !listedIds.has(v.id))];
	});
	public activeVersion = computed(() =>
		this.versions().find(v => this.urlSlug(v) === this.activeVersionSlugSignal()) ?? null,
	);
	public activeVersionData = computed<Data | null>(() => {
		const file = this.api.versionDataResource.value();
		return file ? this.transformer.transform(file) : null;
	});

	/** The URL segment addressing a version: its slug, or its id for custom versions (null slug). */
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
		this.activeVersionSlugSignal.set(slugOrId);
		this.api.setVersionDataPath(this.findByUrlSlug(slugOrId)?.dataPath ?? null);
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
		this.api.setVersionDataPath(version.dataPath);
	}

	public clearActiveVersion(): void
	{
		this.activeVersionSlugSignal.set(null);
		this.api.setVersionDataPath(null);
	}

	/** Makes a just-created version usable right away, and refreshes the canonical list in the background. */
	public registerCreatedVersion(version: Version): void
	{
		this.createdVersionsSignal.update(created => [...created.filter(v => v.id !== version.id), version]);
		this.api.versionsResource.reload();
	}

}
