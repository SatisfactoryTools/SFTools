import {Component, ChangeDetectionStrategy, OnDestroy, signal, Signal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faHashtag, faDiagramProject, faFileCirclePlus, faKeyboard, faTableColumns, faUser} from '@fortawesome/free-solid-svg-icons';
import {BackLinkComponent} from '@src/Components/Common/BackLinkComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {SettingsAccountComponent} from '@src/Components/Settings/SettingsAccountComponent';
import {SettingsGraphComponent} from '@src/Components/Settings/SettingsGraphComponent';
import {SettingsHotkeysComponent} from '@src/Components/Settings/SettingsHotkeysComponent';
import {SettingsNumbersComponent} from '@src/Components/Settings/SettingsNumbersComponent';
import {SettingsPlanDefaultsComponent} from '@src/Components/Settings/SettingsPlanDefaultsComponent';
import {SettingsPlannerComponent} from '@src/Components/Settings/SettingsPlannerComponent';
import {SettingsSection} from '@src/Components/Settings/SettingsSection';
import {AuthService} from '@src/Model/Auth/AuthService';

/**
 * The global settings screen: a left panel listing sections and a wider right
 * panel showing the selected section's controls (standard Bootstrap columns).
 */
@Component({
	templateUrl: './SettingsComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, BackLinkComponent, InfoNoteComponent, SettingsNumbersComponent, SettingsGraphComponent, SettingsPlannerComponent, SettingsPlanDefaultsComponent, SettingsAccountComponent, SettingsHotkeysComponent],
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
			background: #20374c;
			border: 1px solid #4e5d6c;
			border-left: 3px solid transparent;
			transition: border-color 0.15s, background 0.15s;
		}
		.settings-nav button:hover {
			border-color: #4c9be8;
			border-left-color: #4c9be8;
		}
		.settings-nav button.active {
			background: linear-gradient(90deg, rgba(76, 155, 232, 0.22), #20374c 70%);
			border-color: rgba(76, 155, 232, 0.6);
			border-left-color: #4c9be8;
			color: #fff;
		}
		.nav-icon {
			width: 1.75rem;
			height: 1.75rem;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			background: rgba(76, 155, 232, 0.16);
			color: #4c9be8;
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

	public readonly sections: SettingsSection[] = [
		{id: 'numbers', label: 'Numbers', icon: faHashtag},
		{id: 'graph', label: 'Graph', icon: faDiagramProject},
		{id: 'planner', label: 'Planner', icon: faTableColumns},
		{id: 'plan-defaults', label: 'Plan defaults', icon: faFileCirclePlus},
		{id: 'hotkeys', label: 'Hotkeys', icon: faKeyboard},
		{id: 'account', label: 'Account', icon: faUser},
	];

	private readonly activeSectionSignal = signal<string>(this.sections[0].id);
	public readonly activeSection: Signal<string> = this.activeSectionSignal.asReadonly();

	private readonly subscription: Subscription;

	public constructor(
		protected readonly auth: AuthService,
		private readonly route: ActivatedRoute,
		private readonly router: Router,
	)
	{
		// The open section lives in the URL, so a section can be linked to and
		// survives a reload. A bare /settings (or one naming a section that no
		// longer exists) rewrites itself to the first one rather than 404ing.
		this.subscription = route.paramMap.subscribe(params => {
			const section = params.get('section');
			if (section !== null && this.sections.some(candidate => candidate.id === section)) {
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

	public selectSection(id: string): void
	{
		void this.router.navigate(['/settings', id]);
	}

}
