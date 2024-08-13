import {Component, ChangeDetectionStrategy, computed} from '@angular/core';
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

/**
 * The codex content itself, driven entirely by the host's CodexNavigation -
 * the same component backs the planner panel and the fullscreen codex page.
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
})
export class CodexBrowserComponent
{

	public readonly faCubes = faCubes;
	public readonly faScroll = faScroll;
	public readonly faIndustry = faIndustry;
	public readonly faGraduationCap = faGraduationCap;

	public readonly section = computed(() => this.navigation.path().split('/')[0]);

	/** The path remainder after the section, e.g. an entity class name - null on list pages. */
	public readonly detail = computed(() => {
		const segments = this.navigation.path().split('/');
		return segments.length > 1 ? segments.slice(1).join('/') : null;
	});

	public constructor(private readonly navigation: CodexNavigation)
	{
	}

}
