import {Injectable, NgZone, Optional, Signal, WritableSignal, computed, signal} from '@angular/core';
import {env} from '@env/env';
import {firstValueFrom} from 'rxjs';
import {Version} from '@src/Model/API/Schema/Version';
import {VersionsApiService} from '@src/Model/API/VersionsApiService';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';
import {OfflineVersion} from '@src/Model/Desktop/OfflineVersion';
import {OfflineVersionDownload} from '@src/Model/Desktop/OfflineVersionDownload';
import {OfflineCacheKey} from '@src/Model/Network/OfflineCacheKey';
import {NotificationService} from '@src/Model/NotificationService';
import {AppStorage} from '@src/Model/Storage/AppStorage';

const STORAGE_KEY = 'sftools.desktop.offlineVersions';
/** Icon hashes are file-name safe; brush strings and the like are not icons. */
const ICON_HASH = /^[A-Za-z0-9_-]+$/;

@Injectable({providedIn: 'root'})
export class OfflineVersionsService
{

	private readonly versionsSignal: WritableSignal<Record<string, OfflineVersion>>;
	public readonly versions: Signal<Record<string, OfflineVersion>>;

	private readonly downloadSignal: WritableSignal<OfflineVersionDownload | null> = signal(null);
	public readonly download: Signal<OfflineVersionDownload | null> = this.downloadSignal.asReadonly();

	public readonly available: boolean;

	public constructor(
		private readonly storage: AppStorage,
		private readonly versionsApi: VersionsApiService,
		private readonly notifications: NotificationService,
		private readonly zone: NgZone,
		@Optional() private readonly desktop: DesktopBridge | null,
	)
	{
		this.available = desktop !== null;
		this.versionsSignal = signal(this.load());
		this.versions = this.versionsSignal.asReadonly();
		if (desktop !== null) {
			this.dropMissing(desktop);
		}
	}

	public readonly count: Signal<number> = computed(() => Object.keys(this.versionsSignal()).length);

	public isOffline(version: Version): boolean
	{
		return this.versionsSignal()[version.id]?.dataPath === version.dataPath;
	}

	public isOutdated(version: Version): boolean
	{
		const entry = this.versionsSignal()[version.id];
		return entry !== undefined && entry.dataPath !== version.dataPath;
	}

	public isDownloading(version: Version): boolean
	{
		return this.downloadSignal()?.versionId === version.id;
	}

	public async downloadVersion(version: Version): Promise<void>
	{
		if (this.desktop === null || this.downloadSignal() !== null) {
			return;
		}
		const desktop = this.desktop;
		this.downloadSignal.set({versionId: version.id, done: 0, total: 0});
		const job = `${version.id}-${Date.now()}`;
		const stop = await desktop.listen<{job: string; done: number; total: number}>('cache-progress', progress => {
			if (progress.job === job) {
				this.zone.run(() => this.downloadSignal.set({versionId: version.id, done: progress.done, total: progress.total}));
			}
		});
		try {
			const file = await firstValueFrom(this.versionsApi.loadVersionFile(version));
			const icons = [...this.iconHashes(file)];
			const result = await desktop.invoke<{total: number; downloaded: number; failed: number}>('cache_prefetch_images', {
				job,
				images: icons.map(hash => `64/${hash}`),
			});
			this.zone.run(() => {
				this.store({...this.versionsSignal(), [version.id]: {dataPath: version.dataPath, downloadedAt: new Date().toISOString(), icons: icons.length}});
				if (result.failed > 0) {
					this.notifications.show(`${version.name} is available offline, but ${result.failed} icons could not be downloaded. Download it again to retry.`, 10_000);
				} else {
					this.notifications.showSuccess(`${version.name} is available offline.`);
				}
			});
		} catch (error) {
			console.error('Offline download failed:', error);
			this.zone.run(() => this.notifications.show(`${version.name} could not be downloaded. Check your connection and try again.`, 10_000));
		} finally {
			stop();
			this.zone.run(() => this.downloadSignal.set(null));
		}
	}

	public remove(version: Version): void
	{
		const {[version.id]: removed, ...rest} = this.versionsSignal();
		if (removed !== undefined) {
			this.store(rest);
		}
	}

	public forgetAll(): void
	{
		this.store({});
	}

	private iconHashes(value: unknown, found = new Set<string>()): Set<string>
	{
		if (Array.isArray(value)) {
			value.forEach(entry => this.iconHashes(entry, found));
		} else if (value !== null && typeof value === 'object') {
			for (const [key, entry] of Object.entries(value)) {
				if (key === 'icon' && typeof entry === 'string' && ICON_HASH.test(entry)) {
					found.add(entry);
				} else {
					this.iconHashes(entry, found);
				}
			}
		}
		return found;
	}

	private dropMissing(desktop: DesktopBridge): void
	{
		const entries = Object.entries(this.versionsSignal());
		if (entries.length === 0) {
			return;
		}
		const keys = entries.map(([, entry]) => OfflineCacheKey.of('json', `${env.apiUrl}/${entry.dataPath}`, false));
		desktop.invoke<boolean[]>('cache_has', {keys}).then(present => this.zone.run(() => {
			if (present.every(Boolean)) {
				return;
			}
			this.store(Object.fromEntries(entries.filter((_, index) => present[index])));
		}), error => console.error('Could not check the offline versions:', error));
	}

	private load(): Record<string, OfflineVersion>
	{
		try {
			return JSON.parse(this.storage.getItem(STORAGE_KEY) ?? '{}') as Record<string, OfflineVersion>;
		} catch {
			return {};
		}
	}

	private store(versions: Record<string, OfflineVersion>): void
	{
		this.versionsSignal.set(versions);
		this.storage.setItem(STORAGE_KEY, JSON.stringify(versions));
	}

}
