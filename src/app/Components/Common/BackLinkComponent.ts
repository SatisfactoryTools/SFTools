import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowLeft} from '@fortawesome/free-solid-svg-icons';

/**
 * The quiet "← Parent page" link at the top of every non-planner page, so
 * the user can always step back up (home, the mod list, the mod itself…).
 * One look everywhere instead of ad-hoc outline buttons.
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
export class BackLinkComponent
{

	public readonly faArrowLeft = faArrowLeft;

	/** Router commands of the parent page. */
	@Input({required: true}) public link: string | string[] = '/';
	@Input({required: true}) public label = '';

}
