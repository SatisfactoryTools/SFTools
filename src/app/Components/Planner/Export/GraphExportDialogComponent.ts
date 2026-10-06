import {Component, ChangeDetectionStrategy, HostListener, OnInit, Signal, computed, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faImage} from '@fortawesome/free-solid-svg-icons';
import {HotkeyBlockDirective} from '@src/Components/Common/HotkeyBlockDirective';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {GraphExportDialogService} from '@src/Components/Planner/Export/GraphExportDialogService';
import {GraphExportScaleOption} from '@src/Components/Planner/Export/GraphExportScaleOption';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {ExportBox} from '@src/Model/Export/ExportBox';
import {FileDownloader} from '@src/Model/Export/FileDownloader';
import {GraphExportFormat} from '@src/Model/Export/GraphExportFormat';
import {GraphSvgSnapshot} from '@src/Model/Export/GraphSvgSnapshot';
import {NotificationService} from '@src/Model/NotificationService';
import {RasterSize} from '@src/Model/Export/RasterSize';
import {SvgRasterizer} from '@src/Model/Export/SvgRasterizer';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';

/** The website's background, for when the page colour cannot be read. */
const FALLBACK_BACKGROUND = '#0f2537';
const SCALES = [0.5, 0.75, 1, 1.25, 1.5];

@Component({
	selector: 'graph-export-dialog',
	templateUrl: './GraphExportDialogComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, HotkeyBlockDirective, InfoNoteComponent],
	styles: `
		.export-backdrop {
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 1070;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.export-dialog {
			width: min(520px, calc(100vw - 2rem));
			max-height: calc(100vh - 2rem);
			display: flex;
			flex-direction: column;
		}
		.export-dialog > .card-body {
			overflow: auto;
		}
		.preview-box {
			max-height: 240px;
			overflow: auto;
			border-radius: 0.375rem;
			border: 1px solid rgba(255, 255, 255, 0.15);
			/* A checkerboard, so a transparent picture reads as transparent. */
			background-color: #3a4654;
			background-image:
				linear-gradient(45deg, #2a3442 25%, transparent 25%, transparent 75%, #2a3442 75%),
				linear-gradient(45deg, #2a3442 25%, transparent 25%, transparent 75%, #2a3442 75%);
			background-size: 16px 16px;
			background-position: 0 0, 8px 8px;
		}
		.preview-box img {
			display: block;
			max-width: none;
		}
		.preview-wait {
			height: 120px;
		}
	`,
})
export class GraphExportDialogComponent implements OnInit
{

	public readonly faImage = faImage;

	private readonly snapshotSignal = signal<GraphSvgSnapshot | null>(null);
	public readonly snapshot: Signal<GraphSvgSnapshot | null> = this.snapshotSignal.asReadonly();

	private readonly loadingSignal = signal(true);
	public readonly loading: Signal<boolean> = this.loadingSignal.asReadonly();

	private readonly formatSignal = signal<GraphExportFormat>('svg');
	public readonly format: Signal<GraphExportFormat> = this.formatSignal.asReadonly();

	private readonly backgroundSignal = signal(true);
	public readonly background: Signal<boolean> = this.backgroundSignal.asReadonly();

	private readonly scaleSignal = signal(1);
	public readonly scale: Signal<number> = this.scaleSignal.asReadonly();

	private readonly previewSignal = signal<string | null>(null);
	public readonly preview: Signal<string | null> = this.previewSignal.asReadonly();

	private readonly exportingSignal = signal(false);
	public readonly exporting: Signal<boolean> = this.exportingSignal.asReadonly();

	private readonly errorSignal = signal<string | null>(null);
	public readonly error: Signal<string | null> = this.errorSignal.asReadonly();

	public readonly scaleOptions: Signal<GraphExportScaleOption[]> = computed(() => {
		const snapshot = this.snapshot();
		if (snapshot === null) {
			return [];
		}
		return SCALES.map(scale => {
			const size = this.sizeFor(snapshot.contentBox, scale);
			return {scale, label: `${Math.round(scale * 100)} %`, size, fits: this.rasterizer.fits(size)};
		});
	});

	public readonly selectedOption: Signal<GraphExportScaleOption | null> = computed(() =>
		this.scaleOptions().find(option => option.scale === this.scale()) ?? null,
	);

	public readonly someSizeTooLarge: Signal<boolean> = computed(() => this.scaleOptions().some(option => !option.fits));

	/** The preview image is shown so that one of its pixels is one pixel of the screen. */
	public readonly previewCssWidth: Signal<number> = computed(() => {
		const snapshot = this.snapshot();
		return snapshot === null ? 0 : this.sizeFor(snapshot.sampleBox, this.scale()).width / (window.devicePixelRatio || 1);
	});

	public readonly canExport: Signal<boolean> = computed(() =>
		this.snapshot() !== null && !this.exporting() && (this.format() === 'svg' || this.selectedOption()?.fits === true),
	);

	private readonly numberFormat = new Intl.NumberFormat('en');
	private previewRequest = 0;

	public constructor(
		private readonly dialog: GraphExportDialogService,
		private readonly plannerGraph: PlannerGraphService,
		private readonly rasterizer: SvgRasterizer,
		private readonly downloader: FileDownloader,
		private readonly planManager: PlanManager,
		private readonly planNames: PlanNameResolver,
		private readonly notifications: NotificationService,
	)
	{
		const options = dialog.options();
		this.formatSignal.set(options.format);
		this.backgroundSignal.set(options.background);
		this.scaleSignal.set(options.scale);
	}

	public async ngOnInit(): Promise<void>
	{
		try {
			const snapshot = await this.plannerGraph.exportSnapshot();
			this.snapshotSignal.set(snapshot);
			if (snapshot !== null && this.selectedOption()?.fits !== true) {
				const largest = [...this.scaleOptions()].reverse().find(option => option.fits);
				this.scaleSignal.set(largest?.scale ?? 1);
			}
		} catch (error) {
			this.errorSignal.set(this.messageOf(error));
		} finally {
			this.loadingSignal.set(false);
		}
		this.refreshPreview();
	}

	public setFormat(format: GraphExportFormat): void
	{
		this.formatSignal.set(format);
		this.refreshPreview();
	}

	public toggleBackground(): void
	{
		this.backgroundSignal.set(!this.background());
		this.refreshPreview();
	}

	public setScale(option: GraphExportScaleOption): void
	{
		if (option.fits) {
			this.scaleSignal.set(option.scale);
			this.refreshPreview();
		}
	}

	public sizeText(size: RasterSize): string
	{
		return `${this.numberFormat.format(size.width)} × ${this.numberFormat.format(size.height)} px`;
	}

	public async export(): Promise<void>
	{
		const snapshot = this.snapshot();
		if (snapshot === null || !this.canExport()) {
			return;
		}
		this.exportingSignal.set(true);
		this.errorSignal.set(null);
		try {
			const svg = snapshot.render(snapshot.contentBox, this.background() ? this.pageBackground() : null);
			const blob = this.format() === 'svg'
				? new Blob([svg], {type: 'image/svg+xml;charset=utf-8'})
				: await this.rasterizer.toBlob(svg, this.sizeFor(snapshot.contentBox, this.scale()));
			const fileName = this.downloader.safeName(this.planName(), this.format(), 'production-graph');
			const savedPath = await this.downloader.download(blob, fileName);
			this.notifications.showSuccess(savedPath === null ? `Downloaded ${fileName}.` : `Saved to ${savedPath} and opened.`);
			this.dialog.remember({format: this.format(), background: this.background(), scale: this.scale()});
			this.close();
		} catch (error) {
			this.errorSignal.set(this.messageOf(error));
		} finally {
			this.exportingSignal.set(false);
		}
	}

	@HostListener('document:keydown.escape')
	public close(): void
	{
		this.dialog.close();
	}

	private refreshPreview(): void
	{
		const snapshot = this.snapshot();
		const request = ++this.previewRequest;
		this.previewSignal.set(null);
		if (snapshot === null || this.format() !== 'png') {
			return;
		}
		const svg = snapshot.render(snapshot.sampleBox, this.background() ? this.pageBackground() : null);
		this.rasterizer.toDataUrl(svg, this.sizeFor(snapshot.sampleBox, this.scale()))
			.then(url => {
				if (request === this.previewRequest) {
					this.previewSignal.set(url);
				}
			})
			.catch(() => {
				// The preview is a convenience; the export itself reports its own failure.
			});
	}

	private sizeFor(box: ExportBox, scale: number): RasterSize
	{
		return {width: Math.max(1, Math.round(box.width * scale)), height: Math.max(1, Math.round(box.height * scale))};
	}

	private pageBackground(): string
	{
		const color = getComputedStyle(document.body).backgroundColor;
		return color === '' || color === 'transparent' || color === 'rgba(0, 0, 0, 0)' ? FALLBACK_BACKGROUND : color;
	}

	private planName(): string
	{
		const plan = this.planManager.activePlan();
		return plan === null ? '' : this.planNames.displayName(plan);
	}

	private messageOf(error: unknown): string
	{
		return error instanceof Error && error.message !== '' ? error.message : 'The graph could not be exported.';
	}

}
