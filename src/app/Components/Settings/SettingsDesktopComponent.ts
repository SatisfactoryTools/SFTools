import {Component, ChangeDetectionStrategy, Optional, Signal, computed, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {faDesktop} from '@fortawesome/free-solid-svg-icons';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {SettingsSectionComponent} from '@src/Components/Settings/SettingsSectionComponent';
import {Version} from '@src/Model/API/Schema/Version';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';
import {DesktopIntegrationService} from '@src/Model/Desktop/DesktopIntegrationService';
import {DesktopPreferencesService} from '@src/Model/Desktop/DesktopPreferencesService';
import {DesktopReleaseManifest} from '@src/Model/Desktop/DesktopReleaseManifest';
import {DesktopReleaseService} from '@src/Model/Desktop/DesktopReleaseService';
import {DesktopUpdateService} from '@src/Model/Desktop/DesktopUpdateService';
import {OfflineVersionsService} from '@src/Model/Desktop/OfflineVersionsService';
import {WebLinkHandoffService} from '@src/Model/Desktop/WebLinkHandoffService';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';
import {NotificationService} from '@src/Model/NotificationService';

@Component({
	selector: 'settings-desktop',
	templateUrl: './SettingsDesktopComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, SettingsSectionComponent, InfoNoteComponent],
	styles: [`
		.offline-row {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.5rem 1rem;
			padding: 0.4rem 0;
			border-bottom: 1px solid #4e5d6c;
		}
		.offline-row:last-child {
			border-bottom: 0;
		}
		.offline-name {
			flex: 1 1 12rem;
		}
		.data-path {
			word-break: break-all;
		}
	`],
})
export class SettingsDesktopComponent
{

	public readonly sectionIcon = faDesktop;
	public readonly desktop: boolean;

	public readonly release = signal<DesktopReleaseManifest | null>(null);
	public readonly releaseMissing = signal(false);

	public readonly cacheBytes = signal<number | null>(null);
	public linkDraft = '';

	public readonly versions: Signal<Version[]> = computed(() => this.versionManager.versions());

	public constructor(
		@Optional() private readonly bridge: DesktopBridge | null,
		protected readonly preferences: DesktopPreferencesService,
		protected readonly updates: DesktopUpdateService,
		protected readonly offlineVersions: OfflineVersionsService,
		protected readonly handoff: WebLinkHandoffService,
		protected readonly connectivity: ConnectivityService,
		private readonly integration: DesktopIntegrationService,
		private readonly versionManager: VersionManager,
		private readonly notifications: NotificationService,
		releases: DesktopReleaseService,
	)
	{
		this.desktop = bridge !== null;
		if (bridge === null) {
			releases.latest().subscribe({
				next: manifest => this.release.set(manifest),
				error: () => this.releaseMissing.set(true),
			});
		} else {
			this.refreshCacheSize();
		}
	}

	public get dataDir(): string
	{
		return this.bridge?.info.dataDir ?? '';
	}

	public downloadUrl(platform: string): string | null
	{
		return this.release()?.platforms[platform]?.url ?? null;
	}

	public openLink(): void
	{
		if (this.integration.open(this.linkDraft)) {
			this.linkDraft = '';
		} else {
			this.notifications.show('That is not a Satisfactory Tools link.');
		}
	}

	public openDataDir(): void
	{
		this.bridge?.invoke('open_data_dir').catch(error => console.error('Could not open the data folder:', error));
	}

	public clearCache(): void
	{
		if (!confirm('Delete every downloaded game version and icon? Plans and settings are not affected.')) {
			return;
		}
		this.bridge?.invoke('cache_clear').then(() => {
			this.offlineVersions.forgetAll();
			this.refreshCacheSize();
		}, error => console.error('Could not clear the cache:', error));
	}

	public formatBytes(bytes: number): string
	{
		return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} kB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	}

	public async download(version: Version): Promise<void>
	{
		await this.offlineVersions.downloadVersion(version);
		this.refreshCacheSize();
	}

	private refreshCacheSize(): void
	{
		this.bridge?.invoke<{bytes: number}>('cache_info').then(info => this.cacheBytes.set(info.bytes), () => this.cacheBytes.set(null));
	}

}
