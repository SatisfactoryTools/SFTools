import {Component, ChangeDetectionStrategy, Input, OnDestroy, OnInit} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowLeft} from '@fortawesome/free-solid-svg-icons';
import {HotkeyRegistration} from '@src/Model/Hotkeys/HotkeyRegistration';
import {HotkeyService} from '@src/Model/Hotkeys/HotkeyService';
import {BackToPlannerResolver} from '@src/Model/Planner/BackToPlannerResolver';

/**
 * The quiet "← Parent page" link at the top of every non-planner page, so
 * the user can always step back up (home, the mod list, the mod itself…).
 * One look everywhere instead of ad-hoc outline buttons.
 *
 * It also owns the "go back" hotkey (Escape) while it is on screen, which is
 * what gives every one of those pages the same way out from the keyboard.
 */
@Component({
	selector: 'back-link',
	templateUrl: './BackLinkComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [RouterLink, FaIconComponent],
	styles: [`
		:host {
			display: inline-block;
		}
		a {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.35rem 0.85rem 0.35rem 0.7rem;
			font-size: 0.9rem;
			font-weight: 500;
			color: #dde4ef;
			text-decoration: none;
			background: rgba(255, 255, 255, 0.06);
			border: 1px solid rgba(159, 176, 192, 0.45);
			transition: background 0.15s, border-color 0.15s, color 0.15s;
		}
		a:hover,
		a:focus-visible {
			color: #fff;
			background: rgba(76, 155, 232, 0.18);
			border-color: #4c9be8;
		}
		fa-icon {
			color: #4c9be8;
			transition: transform 0.15s;
		}
		a:hover fa-icon {
			transform: translateX(-3px);
		}
	`],
})
export class BackLinkComponent implements OnInit, OnDestroy
{

	public readonly faArrowLeft = faArrowLeft;

	/** Router commands of the parent page. */
	@Input({required: true}) public link: string | string[] = '/';
	@Input({required: true}) public label = '';

	private registration: HotkeyRegistration | null = null;

	public constructor(
		private readonly hotkeys: HotkeyService,
		private readonly backToPlanner: BackToPlannerResolver,
		private readonly router: Router,
	)
	{
	}

	public ngOnInit(): void
	{
		this.registration = this.hotkeys.register('app.back', () => this.goBack());
	}

	public ngOnDestroy(): void
	{
		this.registration?.unregister();
		this.registration = null;
	}

	/**
	 * "Back to planner" wins where the navbar offers it: on the settings or
	 * account page that is where the user came from, and it is the way out
	 * they are looking at. Otherwise the link this back-link itself shows.
	 */
	private goBack(): void
	{
		const planner = this.backToPlanner.link();
		void this.router.navigate(planner ?? (Array.isArray(this.link) ? this.link : [this.link]));
	}

}
