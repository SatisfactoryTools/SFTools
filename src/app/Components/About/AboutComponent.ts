import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faBookOpen, faDiagramProject, faHeart, faPuzzlePiece, faSliders} from '@fortawesome/free-solid-svg-icons';
import {CommunityLinks} from '@src/Model/CommunityLinks';
import {BackLinkComponent} from '@src/Components/Common/BackLinkComponent';
import {HomeFeature} from '@src/Components/Home/HomeFeature';

/** What the site is, what is in it, and who made it. Help and tutorials will join it later. */
@Component({
	templateUrl: './AboutComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, BackLinkComponent],
	styles: [`
		.about-hero {
			display: flex;
			align-items: center;
			gap: 1rem;
			margin: 1rem 0 1.5rem;
		}
		.about-hero img {
			height: 56px;
			filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.45));
		}
		.section-title {
			font-size: 0.8rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.06em;
			color: #9fb0c0;
			margin: 1.75rem 0 0.75rem;
		}
		.feature-list {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
			gap: 0.75rem;
		}
		.feature {
			display: flex;
			gap: 0.9rem;
			padding: 0.9rem 1rem;
			background: #20374c;
			border: 1px solid #4e5d6c;
		}
		.feature-icon {
			flex-shrink: 0;
			width: 2.25rem;
			height: 2.25rem;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			background: rgba(76, 155, 232, 0.16);
			color: #4c9be8;
		}
		.feature-title {
			font-weight: 600;
			margin-bottom: 0.15rem;
		}
		.feature-text {
			font-size: 0.875rem;
			color: #9fb0c0;
			margin: 0;
		}
		.credits {
			background: #20374c;
			border: 1px solid #4e5d6c;
		}
		.credit {
			display: grid;
			grid-template-columns: 11rem minmax(0, 1fr);
			gap: 0.25rem 1rem;
			padding: 0.7rem 1rem;
			border-top: 1px solid rgba(78, 93, 108, 0.6);
		}
		.credit:first-child {
			border-top: 0;
		}
		@media (max-width: 575.98px) {
			.credit {
				grid-template-columns: minmax(0, 1fr);
			}
		}
		.credit-role {
			color: #9fb0c0;
			font-size: 0.875rem;
		}
		.credit-text {
			margin: 0;
		}
		.link-row {
			display: flex;
			flex-wrap: wrap;
			gap: 0.75rem;
		}
		.link-row a {
			display: inline-flex;
			align-items: center;
			gap: 0.6rem;
			padding: 0.6rem 1rem;
			background: #20374c;
			border: 1px solid #4e5d6c;
			color: inherit;
			text-decoration: none;
			transition: border-color 0.15s, background 0.15s;
		}
		.link-row a:hover {
			border-color: #4c9be8;
			background: rgba(76, 155, 232, 0.12);
		}
		.link-row .donation fa-icon {
			color: #e05c8a;
		}
	`],
})
export class AboutComponent
{

	public readonly faHeart = faHeart;
	public readonly communityLinks = CommunityLinks.COMMUNITY;
	public readonly donationLinks = CommunityLinks.DONATIONS;

	public readonly features: HomeFeature[] = [
		{
			icon: faDiagramProject,
			title: 'Planner',
			text: 'Production plans with an optimising solver, manual graph editing, subplans, folders with shared settings and per-plan overrides.',
			link: null,
		},
		{
			icon: faBookOpen,
			title: 'Codex',
			text: 'Browse items, buildings, recipes and milestones of any game version, with search from anywhere in the planner.',
			link: null,
		},
		{
			icon: faSliders,
			title: 'Custom versions',
			text: 'Derive your own game version from a public one: recipe and power cost multipliers, mods, and modded resource-node layouts baked into its data.',
			link: null,
		},
		{
			icon: faPuzzlePiece,
			title: 'Mods',
			text: 'Author sets of data changes - new or overridden items, recipes, buildings - and share them publicly or keep them private.',
			link: null,
		},
	];

}
