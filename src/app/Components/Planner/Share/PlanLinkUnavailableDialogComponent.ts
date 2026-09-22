import {Component, ChangeDetectionStrategy, HostListener} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faLinkSlash} from '@fortawesome/free-solid-svg-icons';
import {HotkeyBlockDirective} from '@src/Components/Common/HotkeyBlockDirective';
import {ActivePlanLinkManager} from '@src/Model/PlanLinks/ActivePlanLinkManager';

/**
 * Shown when a plan link in the address does not open anything: the plan was deleted,
 * it is saved only on its owner's device, or its owner turned link sharing off. Without
 * this the planner silently showed the viewer their own last plan, which looks like the
 * link worked.
 */
@Component({
	selector: 'plan-link-unavailable-dialog',
	templateUrl: './PlanLinkUnavailableDialogComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, HotkeyBlockDirective],
	styles: `
		.link-backdrop {
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 1070;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.link-dialog {
			width: min(520px, calc(100vw - 2rem));
		}
	`,
})
export class PlanLinkUnavailableDialogComponent
{

	public readonly faLinkSlash = faLinkSlash;

	public constructor(private readonly planLink: ActivePlanLinkManager)
	{
	}

	@HostListener('document:keydown.escape')
	public close(): void
	{
		this.planLink.dismissUnavailable();
	}

}
