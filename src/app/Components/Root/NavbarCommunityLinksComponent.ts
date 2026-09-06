import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowUpRightFromSquare, faCaretDown, faCaretUp, faHeart} from '@fortawesome/free-solid-svg-icons';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {TooltipDirective} from 'ngx-bootstrap/tooltip';
import {CommunityLinks} from '@src/Model/CommunityLinks';

/**
 * Discord and GitHub as icon links (labelled inside the collapsed phone
 * menu), plus the donation links: a quiet heart dropdown on desktop, and an
 * inline labelled group in the collapsed phone menu - a floating dropdown
 * there could open off-screen (small or landscape phones). Reachable from
 * the planner too, since the navbar is everywhere.
 */
@Component({
	selector: 'navbar-community-links',
	templateUrl: './NavbarCommunityLinksComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, BsDropdownModule, TooltipDirective],
	styles: [`
		:host {
			display: contents;
		}
		/* The heart gets a tint of its own so the support entry is noticed - but stays a plain nav-link. */
		.support-toggle fa-icon {
			color: #ffb3c6;
			transition: color 0.15s, transform 0.15s;
		}
		.support-toggle:hover fa-icon {
			color: #fff;
			transform: scale(1.12);
		}
		.support-menu {
			min-width: 300px;
			padding: 0;
			overflow: hidden;
			border: 1px solid #5d7189;
			box-shadow: 0 0.75rem 2rem rgba(0, 0, 0, 0.45);
		}
		.support-head {
			display: flex;
			align-items: flex-start;
			gap: 0.75rem;
			padding: 0.9rem 1rem;
			background: linear-gradient(135deg, rgba(224, 92, 138, 0.28), rgba(224, 92, 138, 0.04));
		}
		.support-head fa-icon {
			color: #ff8fab;
			font-size: 1.25rem;
			margin-top: 0.1rem;
		}
		.support-title {
			font-weight: 600;
		}
		.support-sub {
			font-size: 0.8rem;
			color: #c5d0db;
		}
		.support-text {
			padding: 0.75rem 1rem;
			font-size: 0.85rem;
			color: #9fb0c0;
			white-space: normal;
		}
		.support-link {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			padding: 0.65rem 1rem;
			color: #fff;
			text-decoration: none;
			border-top: 1px solid rgba(255, 255, 255, 0.08);
			transition: background 0.15s;
		}
		.support-link:hover {
			background: rgba(255, 255, 255, 0.08);
		}
		.support-link .brand {
			width: 1.5rem;
			text-align: center;
			font-size: 1.1rem;
		}
		.support-link .label {
			flex-grow: 1;
		}
		.support-link .ext {
			font-size: 0.7rem;
			color: #9fb0c0;
		}

		/* Phone menu variant: a fold-out group instead of a floating dropdown. */
		.support-inline-head {
			display: flex;
			align-items: center;
			gap: 0.35rem;
			width: 100%;
			background: none;
			border: 0;
			text-align: left;
		}
		.support-inline-head > fa-icon:first-child {
			color: #ffb3c6;
		}
		.support-inline-head .caret {
			margin-left: 0.25rem;
			font-size: 0.8rem;
			opacity: 0.8;
		}
		.support-inline-body {
			padding: 0 0 0.35rem 1.75rem;
		}
		.support-inline-sub {
			font-size: 0.85rem;
			color: rgba(255, 255, 255, 0.75);
			padding: 0.15rem 0 0.35rem;
		}
		.support-inline-link {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding-left: 0;
		}
		.support-inline-link .brand {
			width: 1.25rem;
			text-align: center;
		}
	`],
})
export class NavbarCommunityLinksComponent
{

	public readonly faHeart = faHeart;
	public readonly faExternal = faArrowUpRightFromSquare;
	public readonly faCaretDown = faCaretDown;
	public readonly faCaretUp = faCaretUp;

	/** The phone-menu support group, folded by default. */
	public inlineOpen = false;
	public readonly community = CommunityLinks.COMMUNITY;
	public readonly donations = CommunityLinks.DONATIONS;

}
