import {Component, ChangeDetectionStrategy, OnDestroy, computed, signal, Signal, WritableSignal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faHashtag, faDesktop, faDiagramProject, faFileCirclePlus, faHeart, faKeyboard, faMap, faRotateLeft, faTableColumns, faUser} from '@fortawesome/free-solid-svg-icons';
import {BackLinkComponent} from '@src/Components/Common/BackLinkComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {SettingsAccountComponent} from '@src/Components/Settings/SettingsAccountComponent';
import {SettingsDesktopComponent} from '@src/Components/Settings/SettingsDesktopComponent';
import {SettingsGraphComponent} from '@src/Components/Settings/SettingsGraphComponent';
import {SettingsHotkeysComponent} from '@src/Components/Settings/SettingsHotkeysComponent';
import {SettingsNumbersComponent} from '@src/Components/Settings/SettingsNumbersComponent';
import {SettingsPlanDefaultsComponent} from '@src/Components/Settings/SettingsPlanDefaultsComponent';
import {SettingsMapComponent} from '@src/Components/Settings/SettingsMapComponent';
import {SettingsPlannerComponent} from '@src/Components/Settings/SettingsPlannerComponent';
import {SettingsSection} from '@src/Components/Settings/SettingsSection';
import {SettingsSupporterComponent} from '@src/Components/Settings/SettingsSupporterComponent';
import {AccountProfileService} from '@src/Model/Auth/AccountProfileService';
import {AuthService} from '@src/Model/Auth/AuthService';
import {AppPlatform} from '@src/Model/Desktop/AppPlatform';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

@Component({
	templateUrl: './SettingsComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, BackLinkComponent, InfoNoteComponent, SettingsNumbersComponent, SettingsGraphComponent, SettingsPlannerComponent, SettingsMapComponent, SettingsPlanDefaultsComponent, SettingsAccountComponent, SettingsHotkeysComponent, SettingsDesktopComponent, SettingsSupporterComponent],
	styles: [`
		.settings-nav {
			display: flex;
			flex-direction: column;
			gap: 0.35rem;
		}
		.settings-nav button {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			width: 100%;
			padding: 0.6rem 0.85rem;
			text-align: left;
			color: #dde4ef;
			background: var(--bs-dark);
			border: 1px solid #4e5d6c;
			border-left: 3px solid transparent;
			transition: border-color 0.15s, background 0.15s;
		}
		.settings-nav button:hover {
			border-color: var(--bs-primary);
			border-left-color: var(--bs-primary);
		}
		.settings-nav button.active {
			background: linear-gradient(90deg, rgba(var(--bs-primary-rgb), 0.22), var(--bs-dark) 70%);
			border-color: rgba(var(--bs-primary-rgb), 0.6);
			border-left-color: var(--bs-primary);
			color: #fff;
		}
		.nav-icon {
			width: 1.75rem;
			height: 1.75rem;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			color: var(--bs-primary);
			font-size: 0.85rem;
			flex-shrink: 0;
		}
		@media (max-width: 767.98px) {
			.settings-nav {
				flex-direction: row;
				flex-wrap: wrap;
			}
			.settings-nav button {
				width: auto;
				flex: 1 1 auto;
			}
		}
	`],
})
export class SettingsComponent implements OnDestroy
{

	private static readonly SUPPORTER_SECTION: SettingsSection = {id: 'supporter', label: 'Supporter', icon: faHeart};

	public readonly sections: SettingsSection[];

	/** The supporter page only joins the menu once the profile says so; its URL works regardless, for the links to it. */
	public readonly visibleSections: Signal<SettingsSection[]> = computed(() => this.account.supporter() !== null
		? [...this.sections, SettingsComponent.SUPPORTER_SECTION]
		: this.sections);

	public readonly faRotateLeft = faRotateLeft;

	private readonly activeSectionSignal: WritableSignal<string>;
	public readonly activeSection: Signal<string>;

	private readonly subscription: Subscription;

	public constructor(
		protected readonly auth: AuthService,
		protected readonly platform: AppPlatform,
		protected readonly settings: SettingsManager,
		private readonly account: AccountProfileService,
		private readonly route: ActivatedRoute,
		private readonly router: Router,
	)
	{
		this.sections = [
			{id: 'numbers', label: 'Numbers', icon: faHashtag},
			{id: 'graph', label: 'Graph', icon: faDiagramProject},
			{id: 'planner', label: 'Planner', icon: faTableColumns},
			{id: 'map', label: 'Map', icon: faMap},
			{id: 'plan-defaults', label: 'Plan defaults', icon: faFileCirclePlus},
			{id: 'hotkeys', label: 'Hotkeys', icon: faKeyboard},
			{id: 'account', label: 'Account', icon: faUser},
		];
		if (platform.desktop || platform.desktopAppPublic) {
			this.sections.push({id: 'desktop', label: 'Desktop app', icon: faDesktop});
		}
		this.activeSectionSignal = signal<string>(this.sections[0].id);
		this.activeSection = this.activeSectionSignal.asReadonly();

		this.subscription = route.paramMap.subscribe(params => {
			const section = params.get('section');
			if (section !== null && (section === SettingsComponent.SUPPORTER_SECTION.id || this.sections.some(candidate => candidate.id === section))) {
				this.activeSectionSignal.set(section);
				return;
			}
			void this.router.navigate(['/settings', this.sections[0].id], {replaceUrl: true});
		});
	}

	public ngOnDestroy(): void
	{
		this.subscription.unsubscribe();
	}

	public resetAll(): void
	{
		if (confirm('Reset all settings to their defaults?\n\n'
			+ 'Plans that use the plan defaults change too. Panel positions and sizes stay.')) {
			this.settings.reset();
		}
	}

	public selectSection(id: string): void
	{
		void this.router.navigate(['/settings', id]);
	}

}
