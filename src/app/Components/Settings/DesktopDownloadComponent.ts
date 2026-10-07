import {DatePipe, NgTemplateOutlet} from '@angular/common';
import {Component, ChangeDetectionStrategy, Signal, computed, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronDown, faChevronRight, faDownload} from '@fortawesome/free-solid-svg-icons';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {SettingsSectionComponent} from '@src/Components/Settings/SettingsSectionComponent';
import {DesktopDownload} from '@src/Model/Desktop/DesktopDownload';
import {DesktopPackageDownload} from '@src/Model/Desktop/DesktopPackageDownload';
import {DesktopPlatforms} from '@src/Model/Desktop/DesktopPlatforms';
import {DesktopReleaseManifest} from '@src/Model/Desktop/DesktopReleaseManifest';
import {DesktopReleaseService} from '@src/Model/Desktop/DesktopReleaseService';
import {VisitorPlatformService} from '@src/Model/Desktop/VisitorPlatformService';

@Component({
	selector: 'desktop-download',
	templateUrl: './DesktopDownloadComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [DatePipe, NgTemplateOutlet, FaIconComponent, SettingsSectionComponent, InfoNoteComponent],
	styles: [`
		:host {
			display: block;
		}
		.download-block {
			display: flex;
			gap: 1rem;
			padding: 1rem 1.1rem;
			background: #20374c;
			border: 1px solid #4e5d6c;
		}
		.download-block.primary {
			background: rgba(76, 155, 232, 0.1);
			border-color: #4c9be8;
		}
		.download-block + .download-block {
			margin-top: 0.75rem;
		}
		.download-icon {
			flex-shrink: 0;
			width: 3rem;
			height: 3rem;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			font-size: 1.75rem;
			background: rgba(76, 155, 232, 0.16);
			color: #4c9be8;
		}
		.download-body {
			flex: 1 1 14rem;
			min-width: 0;
		}
		.download-title {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			gap: 0.2rem 0.6rem;
		}
		.download-name {
			font-weight: 600;
			font-size: 1.05rem;
		}
		.download-badge {
			font-size: 0.7rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			padding: 0.1rem 0.4rem;
			border: 1px solid #d9a52a;
			color: #d9a52a;
			opacity: 0.85;
		}
		.download-meta,
		.download-note {
			font-size: 0.875rem;
			color: #9fb0c0;
		}
		.download-buttons {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			margin-top: 0.75rem;
		}
		.download-size {
			opacity: 0.75;
			font-size: 0.85em;
			margin-left: 0.3rem;
		}
		.download-note {
			margin-top: 0.6rem;
		}
		.download-others-toggle {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			width: 100%;
			margin-top: 0.75rem;
			padding: 0.5rem 1rem;
			border: 1px solid #4e5d6c;
			background: #20374c;
			color: inherit;
			text-align: left;
			transition: border-color 0.15s, background 0.15s;
		}
		.download-others-toggle:hover {
			border-color: #4c9be8;
			background: #243e56;
		}
		.download-others-toggle .text-secondary {
			font-size: 0.875rem;
		}
		.download-others {
			margin-top: 0.75rem;
		}
	`],
})
export class DesktopDownloadComponent
{

	public readonly sectionIcon = faDownload;
	public readonly faDownload = faDownload;
	public readonly faChevronDown = faChevronDown;
	public readonly faChevronRight = faChevronRight;

	public readonly release = signal<DesktopReleaseManifest | null>(null);
	public readonly releaseMissing = signal(false);
	public readonly downloads: Signal<DesktopDownload[]>;
	public readonly primaryDownload: Signal<DesktopDownload | null>;
	public readonly otherDownloads: Signal<DesktopDownload[]>;
	public readonly otherNames: Signal<string>;
	public readonly othersOpen = signal(false);

	public constructor(releases: DesktopReleaseService, visitorPlatform: VisitorPlatformService)
	{
		const detected = visitorPlatform.detect();
		this.downloads = computed(() => {
			const manifest = this.release();
			if (manifest === null) {
				return [];
			}
			return DesktopPlatforms.ALL
				.map((platform): DesktopDownload => ({
					platform,
					packages: platform.packages
						.filter(info => info.key in manifest.platforms)
						.map((info): DesktopPackageDownload => ({info, url: manifest.platforms[info.key].url, size: manifest.platforms[info.key].size ?? null})),
					recommended: platform === detected,
				}))
				.filter(download => download.packages.length > 0)
				.sort((a, b) => Number(b.recommended) - Number(a.recommended));
		});
		this.primaryDownload = computed(() => this.downloads()[0] ?? null);
		this.otherDownloads = computed(() => this.downloads().slice(1));
		this.otherNames = computed(() => this.otherDownloads().map(download => download.platform.name).join(', '));
		releases.latest().subscribe({
			next: manifest => this.release.set(manifest),
			error: () => this.releaseMissing.set(true),
		});
	}

	public toggleOthers(): void
	{
		this.othersOpen.update(open => !open);
	}

	public formatBytes(bytes: number): string
	{
		return bytes < 1000 * 1000 ? `${Math.ceil(bytes / 1000)} kB` : `${(bytes / 1000 / 1000).toFixed(1)} MB`;
	}

}
