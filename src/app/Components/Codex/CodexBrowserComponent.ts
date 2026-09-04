import {Component, ChangeDetectionStrategy, ElementRef, computed, effect} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCubes, faGraduationCap, faIndustry, faScroll} from '@fortawesome/free-solid-svg-icons';
import {CodexBuildingDetailComponent} from '@src/Components/Codex/CodexBuildingDetailComponent';
import {CodexBuildingsComponent} from '@src/Components/Codex/CodexBuildingsComponent';
import {CodexItemDetailComponent} from '@src/Components/Codex/CodexItemDetailComponent';
import {CodexItemsComponent} from '@src/Components/Codex/CodexItemsComponent';
import {CodexLinkDirective} from '@src/Components/Codex/CodexLinkDirective';
import {CodexNavigation} from '@src/Components/Codex/CodexNavigation';
import {CodexRecipeDetailComponent} from '@src/Components/Codex/CodexRecipeDetailComponent';
import {CodexRecipesComponent} from '@src/Components/Codex/CodexRecipesComponent';
import {CodexSchematicDetailComponent} from '@src/Components/Codex/CodexSchematicDetailComponent';
import {CodexSchematicsComponent} from '@src/Components/Codex/CodexSchematicsComponent';
import {CodexSectionEntry} from '@src/Components/Codex/CodexSectionEntry';
import {VersionManager} from '@src/Model/Data/VersionManager';

/**
 * The codex content itself, driven entirely by the host's CodexNavigation -
 * the same component backs the planner panel and the fullscreen codex page.
 * The root path shows the section menu: one tile per section, in the same
 * card style as the section lists, with the entry count.
 */
@Component({
	selector: 'codex-browser',
	templateUrl: './CodexBrowserComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		FaIconComponent,
		CodexLinkDirective,
		CodexItemsComponent,
		CodexItemDetailComponent,
		CodexRecipesComponent,
		CodexRecipeDetailComponent,
		CodexBuildingsComponent,
		CodexBuildingDetailComponent,
		CodexSchematicsComponent,
		CodexSchematicDetailComponent,
	],
	styles: `
		:host {
			display: block;
		}
		.section-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
			gap: 0.5rem;
			max-width: 1000px;
		}
		a.section {
			flex-direction: row;
			align-items: center;
			gap: 0.75rem;
			padding: 0.75rem 1rem;
			text-decoration: none;
			color: var(--bs-body-color);
			min-width: 0;
		}
		a.section:hover {
			border-color: var(--bs-primary);
		}
		.section-icon {
			font-size: 1.75rem;
			color: #9fb0c0;
			flex: none;
		}
		.section-text {
			display: flex;
			flex-direction: column;
			line-height: 1.25;
			min-width: 0;
		}
		.section-name {
			font-size: 1.1em;
			font-weight: 600;
		}
	`,
})
export class CodexBrowserComponent
{

	public readonly section = computed(() => this.navigation.path().split('/')[0]);

	/** The path remainder after the section, e.g. an entity class name - null on list pages. */
	public readonly detail = computed(() => {
		const segments = this.navigation.path().split('/');
		return segments.length > 1 ? segments.slice(1).join('/') : null;
	});

	public readonly sections = computed<CodexSectionEntry[]>(() => {
		const data = this.versionManager.activeVersionData();
		const count = (amount: number, noun: string): string => `${amount} ${noun}`;
		return [
			{link: 'items', name: 'Items', icon: faCubes, count: count(data?.items.length ?? 0, 'items')},
			{
				link: 'recipes',
				name: 'Recipes',
				icon: faScroll,
				count: count(data?.recipes.filter(recipe => !recipe.inBuildGun).length ?? 0, 'recipes'),
			},
			{link: 'buildings', name: 'Buildings', icon: faIndustry, count: count(data?.buildings.length ?? 0, 'buildings')},
			{link: 'schematics', name: 'Schematics', icon: faGraduationCap, count: count(data?.schematics.length ?? 0, 'schematics')},
		];
	});

	public constructor(
		private readonly navigation: CodexNavigation,
		private readonly versionManager: VersionManager,
		private readonly host: ElementRef<HTMLElement>,
	)
	{
		// Inside a panel the codex swaps its content within one scroll
		// container, which would otherwise keep its offset - opening a detail
		// from far down a list would land mid-page. The fullscreen page
		// scrolls the window, which the router's scroll restoration resets.
		effect(() => {
			this.navigation.path();
			this.scrollContainerToTop();
		});
	}

	private scrollContainerToTop(): void
	{
		for (let element = this.host.nativeElement.parentElement; element !== null; element = element.parentElement) {
			const overflowY = getComputedStyle(element).overflowY;
			if (overflowY === 'auto' || overflowY === 'scroll') {
				element.scrollTop = 0;
				return;
			}
		}
	}

}
