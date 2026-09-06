import {Component, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowRight, faBookOpen, faCircleInfo, faDiagramProject, faHeart, faPlay, faPlus, faPuzzlePiece, faRightFromBracket, faSliders, faUser, faXmark} from '@fortawesome/free-solid-svg-icons';
import {OAuthProviderButtonsComponent} from '@src/Components/Auth/OAuthProviderButtonsComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {HomeFeature} from '@src/Components/Home/HomeFeature';
import {VersionTag} from '@src/Components/Home/VersionTag';
import {Version} from '@src/Model/API/Schema/Version';
import {WorldDataPayload} from '@src/Model/API/Schema/World/WorldDataPayload';
import {AccountProfileService} from '@src/Model/Auth/AccountProfileService';
import {AuthService} from '@src/Model/Auth/AuthService';
import {LogoutService} from '@src/Model/Auth/LogoutService';
import {SignInPromptService} from '@src/Model/Auth/SignInPromptService';
import {CommunityLinks} from '@src/Model/CommunityLinks';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {LocalPlanStoreBackend} from '@src/Model/Planner/LocalPlanStoreBackend';
import {PlanCountsService} from '@src/Model/Planner/PlanCountsService';
import {RelativeTimeFormatter} from '@src/Model/RelativeTimeFormatter';
import {PlannerLocationService} from '@src/Model/Planner/PlannerLocationService';

const WORLD_MODE_LABELS: Record<string, string> = {
	'none': 'default nodes',
	'random': 'random nodes',
	'basic-rich': 'basic rich nodes',
	'advanced-rich': 'advanced rich nodes',
	'fossil-fuel-rich': 'fossil fuel rich nodes',
};

const WORLD_PURITY_LABELS: Record<string, string> = {
	'no-change': 'default purity',
	'all-impure': 'all impure',
	'decrease': 'decreased purity',
	'all-normal': 'all normal',
	'increase': 'increased purity',
	'all-pure': 'all pure',
	'all-random': 'random purity',
};

/**
 * The landing page: hero with the way back into the last planner (or into
 * the current release), a sign-in panel for signed-out users, the feature
 * tiles, and the game version picker (public + own custom).
 */
@Component({
	templateUrl: './HomeComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [RouterLink, FaIconComponent, OAuthProviderButtonsComponent, InfoNoteComponent],
	styles: [`
		:host {
			display: block;
			position: relative;
			/* Bleed past the content container's gutter so the backdrop spans the page. */
			margin: 0 calc(var(--bs-gutter-x, 1.5rem) * -0.5);
			padding: 0 calc(var(--bs-gutter-x, 1.5rem) * 0.5);
			overflow: hidden;
		}
		/* Backdrop: two soft glows plus a faint blueprint grid fading out downwards. */
		:host::before {
			content: '';
			position: absolute;
			inset: 0 0 auto 0;
			height: 640px;
			pointer-events: none;
			background:
				radial-gradient(ellipse 45% 55% at 18% 0%, rgba(76, 155, 232, 0.22), transparent 70%),
				radial-gradient(ellipse 35% 40% at 88% 8%, rgba(240, 173, 78, 0.14), transparent 70%),
				repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.035) 0 1px, transparent 1px 36px),
				repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.035) 0 1px, transparent 1px 36px);
			mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0));
			-webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0));
		}
		.home {
			position: relative;
			max-width: 1080px;
			margin: 0 auto;
			padding: 2.5rem 0 4rem;
			display: flex;
			flex-direction: column;
			gap: 2.75rem;
		}

		/* ── Hero ─────────────────────────────────────────────────────── */
		.hero {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			gap: 2rem;
			/* Top-aligned on purpose: the side card changes height (dismissing
			   the sign-in panel) and the copy must not jump with it. */
			align-items: start;
		}
		@media (min-width: 900px) {
			.hero.with-side {
				grid-template-columns: minmax(0, 1fr) 360px;
			}
		}
		.hero-brand {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			margin-bottom: 1.25rem;
		}
		.hero-brand img {
			height: 56px;
			max-width: 100%;
			filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.45));
		}
		@media (max-width: 480px) {
			.hero-brand {
				flex-wrap: wrap;
				gap: 0.5rem;
			}
			.hero-brand img {
				height: 40px;
			}
		}
		.hero-title {
			font-size: clamp(1.75rem, 3.5vw, 2.5rem);
			font-weight: 700;
			line-height: 1.15;
			margin-bottom: 0.75rem;
		}
		.hero-title em {
			font-style: normal;
			color: #f0ad4e;
		}
		.hero-lead {
			font-size: 1.1rem;
			color: #c5d0db;
			max-width: 34rem;
			margin-bottom: 1.5rem;
		}
		.hero-actions {
			display: flex;
			flex-wrap: wrap;
			gap: 0.75rem;
			align-items: stretch;
		}
		.hero-actions .btn-lg {
			display: inline-flex;
			align-items: center;
			gap: 0.6rem;
			padding: 0.65rem 1.4rem;
		}
		/* Once the two buttons no longer fit side by side they stack as equal full-width rows. */
		@media (max-width: 575.98px) {
			.hero-actions {
				flex-direction: column;
				align-items: stretch;
			}
			.hero-actions .btn-lg {
				justify-content: center;
				text-align: center;
			}
		}
		.hero-actions .btn-outline-light {
			--bs-btn-color: #fff;
			--bs-btn-border-color: rgba(255, 255, 255, 0.5);
			--bs-btn-hover-color: #fff;
			--bs-btn-hover-bg: rgba(255, 255, 255, 0.12);
			--bs-btn-hover-border-color: rgba(255, 255, 255, 0.8);
		}
		.hero-actions .btn-primary {
			box-shadow: 0 0.5rem 1.5rem rgba(76, 155, 232, 0.35);
		}
		.hero-sub {
			display: block;
			font-size: 0.75rem;
			opacity: 0.8;
			font-weight: 400;
		}
		.hero-links {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.35rem 1.25rem;
			margin-top: 1.25rem;
			font-size: 0.9rem;
			color: #9fb0c0;
		}
		.hero-links a {
			display: inline-flex;
			align-items: center;
			gap: 0.35rem;
			color: #c5d0db;
			text-decoration: none;
		}
		.hero-links a:hover {
			color: #fff;
			text-decoration: underline;
		}
		.hero-donate {
			display: inline-flex;
			align-items: center;
			gap: 0.35rem;
			flex-wrap: wrap;
		}
		.hero-donate fa-icon {
			color: #e05c8a;
		}
		.hero-donate a {
			color: #f7d08a;
		}
		.side-note {
			font-size: 0.8rem;
		}

		/* Sign-in / welcome side card */
		.side-card {
			box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.35);
		}
		.side-card .card-header {
			padding: 0.75rem 1.25rem;
		}
		.side-card .card-body {
			padding: 1rem 1.25rem 1.25rem;
		}
		.side-card .card-footer {
			padding: 0.5rem 1.25rem;
		}
		.welcome-avatar {
			width: 40px;
			height: 40px;
			border-radius: 50%;
			object-fit: cover;
			flex-shrink: 0;
		}
		.quick-links {
			display: flex;
			flex-direction: column;
			gap: 0.35rem;
		}
		.quick-links a {
			display: flex;
			align-items: center;
			gap: 0.6rem;
			padding: 0.5rem 0.75rem;
			color: inherit;
			text-decoration: none;
			background: rgba(255, 255, 255, 0.04);
			border: 1px solid rgba(78, 93, 108, 0.6);
			transition: border-color 0.15s, background 0.15s;
		}
		.quick-links a:hover {
			background: rgba(76, 155, 232, 0.12);
			border-color: #4c9be8;
		}

		/* ── Feature tiles ─────────────────────────────────────────────── */
		.features {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
			gap: 0.75rem;
		}
		.feature {
			display: block;
			padding: 1rem 1.1rem;
			background: rgba(32, 55, 76, 0.7);
			border: 1px solid rgba(78, 93, 108, 0.7);
			color: inherit;
			text-decoration: none;
			transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
		}
		a.feature:hover {
			border-color: #4c9be8;
			transform: translateY(-2px);
			box-shadow: 0 0.6rem 1.5rem rgba(0, 0, 0, 0.35);
		}
		.feature-icon {
			width: 2.25rem;
			height: 2.25rem;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			background: rgba(76, 155, 232, 0.16);
			color: #4c9be8;
			font-size: 1.05rem;
			margin-bottom: 0.6rem;
		}
		.feature-title {
			font-weight: 600;
			margin-bottom: 0.2rem;
		}
		.feature-text {
			font-size: 0.85rem;
			color: #9fb0c0;
			margin: 0;
		}

		/* ── Version cards ─────────────────────────────────────────────── */
		.section-head {
			display: flex;
			flex-wrap: wrap;
			align-items: flex-end;
			justify-content: space-between;
			gap: 0.5rem 1rem;
			margin-bottom: 0.9rem;
		}
		.section-head h2 {
			font-size: 1.35rem;
			font-weight: 600;
			margin: 0;
		}
		.section-head p {
			margin: 0;
			font-size: 0.9rem;
			color: #9fb0c0;
		}
		.version-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
			gap: 0.75rem;
		}
		.version-card {
			position: relative;
			display: flex;
			align-items: center;
			gap: 0.75rem;
			min-height: 84px;
			padding: 0.85rem 1rem;
			background: #20374c;
			border: 1px solid #4e5d6c;
			border-left: 4px solid #4c9be8;
			color: inherit;
			text-decoration: none;
			transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
		}
		.version-card:hover {
			border-color: #4c9be8;
			transform: translateY(-2px);
			box-shadow: 0 0.6rem 1.5rem rgba(0, 0, 0, 0.4);
		}
		.version-card.experimental { border-left-color: #f0ad4e; }
		.version-card.custom { border-left-color: #5bc0de; }
		.version-card.featured {
			background: linear-gradient(135deg, rgba(76, 155, 232, 0.22), #20374c 65%);
		}
		.version-main {
			flex-grow: 1;
			min-width: 0;
		}
		.version-name {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
			gap: 0.4rem;
			font-weight: 600;
			font-size: 1.05rem;
			margin-bottom: 0.35rem;
		}
		.version-arrow {
			color: #9fb0c0;
			transition: transform 0.15s, color 0.15s;
		}
		.version-card:hover .version-arrow {
			color: #fff;
			transform: translateX(3px);
		}
		.version-card-new {
			justify-content: center;
			border-style: dashed;
			border-left-width: 1px;
			background: transparent;
			color: #9fb0c0;
		}
		.version-card-new:hover {
			color: #fff;
			background: rgba(76, 155, 232, 0.08);
		}
		.version-link {
			color: inherit;
			text-decoration: none;
		}
		.remove-btn {
			position: absolute;
			top: 0.35rem;
			right: 0.35rem;
			z-index: 2;
			opacity: 0;
			transition: opacity 0.15s;
		}
		.version-card:hover .remove-btn,
		.remove-btn:focus-visible {
			opacity: 1;
		}
		@media (hover: none) {
			.remove-btn { opacity: 1; }
		}
		.last-opened {
			font-size: 0.7rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			color: #f0ad4e;
		}

		.tags {
			display: flex;
			flex-wrap: wrap;
			gap: 0.3rem;
		}
		.tag {
			font-size: 0.72rem;
			line-height: 1.2;
			padding: 0.2rem 0.45rem;
			background: rgba(255, 255, 255, 0.08);
			color: #c5d0db;
			white-space: nowrap;
		}
		.tag-official { background: rgba(76, 155, 232, 0.25); color: #9ccdf7; }
		.tag-experimental { background: rgba(240, 173, 78, 0.25); color: #f7d08a; }
		.tag-ficsmas { background: rgba(217, 83, 79, 0.28); color: #f3a6a3; }
		.tag-custom { background: rgba(91, 192, 222, 0.22); color: #a6e3f2; }
		.tag-mods { background: rgba(156, 39, 176, 0.28); color: #d9a3e6; }
		.tag-world { background: rgba(92, 184, 92, 0.22); color: #a8dea8; }
		.plan-meta {
			display: flex;
			flex-direction: column;
			align-items: flex-end;
			gap: 0.1rem;
			font-size: 0.8rem;
			color: #9fb0c0;
			white-space: nowrap;
			text-align: right;
		}
		.plan-meta .count {
			display: inline-flex;
			align-items: center;
			gap: 0.35rem;
			color: #c5d0db;
		}
		.plan-meta .edited {
			font-size: 0.72rem;
		}
	`],
})
export class HomeComponent
{

	public readonly faPlay = faPlay;
	public readonly faArrowRight = faArrowRight;
	public readonly faPlus = faPlus;
	public readonly faXmark = faXmark;
	public readonly faPuzzlePiece = faPuzzlePiece;
	public readonly faSliders = faSliders;
	public readonly faUser = faUser;
	public readonly faCircleInfo = faCircleInfo;
	public readonly faHeart = faHeart;
	public readonly faRightFromBracket = faRightFromBracket;
	public readonly communityLinks = CommunityLinks.COMMUNITY;
	public readonly donationLinks = CommunityLinks.DONATIONS;
	public readonly faDiagramProject = faDiagramProject;

	public constructor(
		protected readonly versionManager: VersionManager,
		protected readonly auth: AuthService,
		protected readonly signInPrompt: SignInPromptService,
		protected readonly account: AccountProfileService,
		private readonly planCounts: PlanCountsService,
		private readonly logoutService: LogoutService,
		private readonly plannerLocation: PlannerLocationService,
	)
	{
		// Cheap one-call summary; refetched on every home visit so counts are current.
		this.planCounts.refresh();
	}

	public get publicVersions(): Version[]
	{
		return this.versionManager.versions().filter(version => !version.custom);
	}

	public get customVersions(): Version[]
	{
		return this.versionManager.versions().filter(version => version.custom);
	}

	/** The release to open by default: the official non-experimental one, else the first public version. */
	public get featuredVersion(): Version | null
	{
		const publics = this.publicVersions;
		return publics.find(version => version.official && !version.experimental)
			?? publics.find(version => !version.experimental)
			?? publics[0]
			?? null;
	}

	/** The version of the last planner the user had open, while it still exists. */
	public get lastVisitedVersion(): Version | null
	{
		const location = this.plannerLocation.location();
		return location === null ? null : this.versionManager.findByUrlSlug(location.versionSlug);
	}

	/** Router commands back into the last planner (with its plan), or null when there is none to return to. */
	public get continueLink(): string[] | null
	{
		const location = this.plannerLocation.location();
		const version = this.lastVisitedVersion;
		if (location === null || version === null) {
			return null;
		}
		const link = ['/', this.versionManager.urlSlug(version), 'planner'];
		if (location.planId !== null) {
			link.push(location.planId);
		}
		return link;
	}

	public plannerLink(version: Version): string[]
	{
		return ['/', this.versionManager.urlSlug(version), 'planner'];
	}

	public get features(): HomeFeature[]
	{
		const featured = this.featuredVersion;
		const slug = featured === null ? null : this.versionManager.urlSlug(featured);
		return [
			{
				icon: faDiagramProject,
				title: 'Planner',
				text: 'Describe what you want to produce; an optimising solver lays out the factory. Then edit the graph by hand.',
				link: slug === null ? null : ['/', slug, 'planner'],
			},
			{
				icon: faBookOpen,
				title: 'Codex',
				text: 'Every item, recipe, building and milestone of each game version, searchable.',
				link: slug === null ? null : ['/', slug, 'codex'],
			},
			{
				icon: faSliders,
				title: 'Custom versions',
				text: 'Your own ruleset: recipe and power cost multipliers, mods, reshaped resource nodes.',
				link: ['/create-version'],
			},
			{
				icon: faPuzzlePiece,
				title: 'Mods',
				text: 'Author sets of data changes - new or overridden items, recipes and buildings - and share them.',
				link: ['/mods'],
			},
		];
	}

	/**
	 * "3 plans" for the version. Signed in: the account's plans (from the
	 * plan-counts API) plus any stranded local ones ("· 1 on this device");
	 * signed out: the plans this browser holds. Null when there is nothing.
	 */
	public planCountLabel(version: Version): string | null
	{
		const local = LocalPlanStoreBackend.countPlans(version.id);
		if (!this.auth.isAuthenticated()) {
			return local === 0 ? null : `${local} plan${local === 1 ? '' : 's'}`;
		}
		const account = this.planCounts.countFor(version.id)?.planCount ?? 0;
		const parts: string[] = [];
		if (account > 0) {
			parts.push(`${account} plan${account === 1 ? '' : 's'}`);
		}
		if (local > 0) {
			parts.push(account > 0 ? `${local} on this device` : `${local} plan${local === 1 ? '' : 's'} on this device`);
		}
		return parts.length === 0 ? null : parts.join(' · ');
	}

	/** "edited 2 days ago" for the account's plans in the version; null when unknown. */
	public lastEditedLabel(version: Version): string | null
	{
		const count = this.planCounts.countFor(version.id);
		if (count === null || count.planCount === 0) {
			return null;
		}
		const ago = RelativeTimeFormatter.ago(count.lastPlanUpdatedAt);
		return ago === '' ? null : `edited ${ago}`;
	}

	public logout(): void
	{
		this.logoutService.logout();
	}

	public isLastVisited(version: Version): boolean
	{
		return this.lastVisitedVersion?.id === version.id;
	}

	/** Public versions state what they are; custom versions list their base and every non-default modifier. */
	public tags(version: Version): VersionTag[]
	{
		const tags: VersionTag[] = [];

		if (!version.custom) {
			tags.push(version.official ? {label: 'Official release', tone: 'official'} : {label: 'Public version', tone: 'official'});
		}
		if (version.experimental) {
			tags.push({label: 'Experimental', tone: 'experimental'});
		}
		if (version.ficsmas) {
			tags.push({label: 'FICSMAS', tone: 'ficsmas'});
		}

		const base = this.versionManager.versions().find(candidate => candidate.id === version.baseVersion);
		if (base) {
			tags.push({label: `Based on ${base.name}`, tone: 'custom'});
		}
		if (version.recipeCost !== 1) {
			tags.push({label: `recipe cost ×${version.recipeCost}`, tone: 'modifier'});
		}
		if (version.powerCost !== 1) {
			tags.push({label: `power cost ×${version.powerCost}`, tone: 'modifier'});
		}

		const modCount = version.mods?.length ?? 0;
		if (modCount > 0) {
			tags.push({label: `${modCount} mod${modCount === 1 ? '' : 's'}`, tone: 'mods'});
		}
		if (version.worldData) {
			tags.push(...this.worldTags(version.worldData, version.custom));
		}
		return tags;
	}

	/**
	 * The world-generation changes: node mode, purity, and the seed they ran
	 * with. Vanilla generation settings on a custom version mean the counts
	 * were edited by hand; on a public version they are simply the default
	 * world and say nothing.
	 */
	private worldTags(world: WorldDataPayload, custom: boolean): VersionTag[]
	{
		const vanilla = (world.mode ?? 'none') === 'none' && (world.purity ?? 'no-change') === 'no-change';
		if (vanilla) {
			return custom ? [{label: 'edited resources', tone: 'world'}] : [];
		}
		const labels: string[] = [];
		if (world.mode !== undefined && world.mode !== 'none') {
			labels.push(WORLD_MODE_LABELS[world.mode] ?? world.mode);
		}
		if (world.purity !== undefined && world.purity !== 'no-change') {
			labels.push(WORLD_PURITY_LABELS[world.purity] ?? world.purity);
		}
		if (world.seed !== undefined) {
			labels.push(`seed ${world.seed}`);
		}
		return labels.map(label => ({label, tone: 'world'}));
	}

	/** Only removes the user's link (or localStorage entry) - the version itself is shared and keeps existing. */
	public removeVersion(version: Version): void
	{
		if (confirm(`Remove "${version.name}" from your versions? Plans referencing it keep working, and creating the same definition again brings it back.`)) {
			this.versionManager.removeCustomVersion(version);
		}
	}

}
