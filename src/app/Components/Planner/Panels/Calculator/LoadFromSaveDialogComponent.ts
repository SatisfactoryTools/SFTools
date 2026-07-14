import {Component, ChangeDetectionStrategy, EventEmitter, Input, OnDestroy, Output, Signal, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Subscription} from 'rxjs';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faTriangleExclamation} from '@fortawesome/free-solid-svg-icons';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {SaveFileService} from '@src/Model/SaveFile/SaveFileService';
import {SaveSettingsMapper} from '@src/Model/SaveFile/SaveSettingsMapper';
import {SaveSettingsMapResult} from '@src/Model/SaveFile/SaveSettingsMapResult';

type LoadFromSaveState = 'idle' | 'parsing' | 'ready' | 'error';

/**
 * Modal loading a Satisfactory save file and previewing the machine, recipe
 * and generator-fuel selections its unlock progression implies. Each of the
 * three categories can be unchecked to keep the target's current selection;
 * the host applies the emitted settings to the active plan or folder.
 */
@Component({
	selector: 'load-from-save-dialog',
	templateUrl: './LoadFromSaveDialogComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, FormsModule],
	styles: `
		.save-backdrop {
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 1070;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.save-dialog {
			width: min(560px, calc(100vw - 2rem));
		}
		.save-dialog input[type='file']::file-selector-button {
			background-color: #4e5d6c;
			color: #ebebeb;
			border: 0;
		}
	`,
})
export class LoadFromSaveDialogComponent implements OnDestroy
{

	@Input({required: true}) public targetName = '';
	@Input({required: true}) public baseSettings!: PlanSettings;
	@Output() public readonly apply = new EventEmitter<PlanSettings>();
	@Output() public readonly close = new EventEmitter<void>();

	public readonly faTriangleExclamation = faTriangleExclamation;

	public loadMachines = true;
	public loadRecipes = true;
	public loadGenerators = true;

	private readonly stateSignal = signal<LoadFromSaveState>('idle');
	public readonly state: Signal<LoadFromSaveState> = this.stateSignal.asReadonly();

	private readonly errorSignal = signal<string | null>(null);
	public readonly error: Signal<string | null> = this.errorSignal.asReadonly();

	private readonly resultSignal = signal<SaveSettingsMapResult | null>(null);
	public readonly result: Signal<SaveSettingsMapResult | null> = this.resultSignal.asReadonly();

	private parseSubscription: Subscription | null = null;

	public constructor(
		private readonly saveFileService: SaveFileService,
		private readonly mapper: SaveSettingsMapper,
		private readonly versionManager: VersionManager,
	)
	{
	}

	public onFilePicked(event: Event): void
	{
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) {
			return;
		}

		const data = this.versionManager.activeVersionData();
		if (!data) {
			this.errorSignal.set('No game data is loaded for the active version.');
			this.stateSignal.set('error');
			return;
		}

		this.stateSignal.set('parsing');
		this.errorSignal.set(null);
		this.resultSignal.set(null);
		this.parseSubscription?.unsubscribe();
		this.parseSubscription = this.saveFileService.parse(file).subscribe({
			next: unlocks => {
				this.resultSignal.set(this.mapper.map(unlocks, data));
				this.stateSignal.set('ready');
			},
			error: (error: Error) => {
				this.errorSignal.set(error.message);
				this.stateSignal.set('error');
			},
		});
	}

	public canApply(): boolean
	{
		return this.state() === 'ready' && (this.loadMachines || this.loadRecipes || this.loadGenerators);
	}

	/** Unchecked categories keep the base settings' current selection. */
	public applySettings(): void
	{
		const result = this.result();
		if (!result || !this.canApply()) {
			return;
		}
		this.apply.emit({
			...this.baseSettings,
			...(this.loadRecipes ? {enabledRecipes: result.enabledRecipes} : {}),
			...(this.loadMachines ? {disabledMachines: result.disabledMachines} : {}),
			...(this.loadGenerators ? {enabledFuels: result.enabledFuels} : {}),
		});
	}

	/** The dialog is destroyed on close - a parse still running is cancelled with it. */
	public ngOnDestroy(): void
	{
		this.parseSubscription?.unsubscribe();
	}

}
