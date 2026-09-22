import {Component, ChangeDetectionStrategy, computed, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faTrash} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {BackLinkComponent} from '@src/Components/Common/BackLinkComponent';
import {CollapsibleCardComponent} from '@src/Components/Common/CollapsibleCardComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {HelpEditorApiService} from '@src/Model/API/HelpEditorApiService';
import {HelpEditorArticle} from '@src/Model/API/Schema/Help/HelpEditorArticle';
import {HelpEditorCategory} from '@src/Model/API/Schema/Help/HelpEditorCategory';
import {HelpManager} from '@src/Model/Help/HelpManager';
import {HelpTopicCoverage} from '@src/Model/Help/HelpTopicCoverage';
import {NotificationService} from '@src/Model/NotificationService';

/**
 * The help editor's home: every article (drafts included) and the sections
 * they are grouped into. Writing itself happens in HelpArticleEditorComponent;
 * this page only creates, deletes and reorders.
 */
@Component({
	templateUrl: './HelpEditorComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		DatePipe,
		FormsModule,
		RouterLink,
		FaIconComponent,
		AppTooltipDirective,
		BackLinkComponent,
		CollapsibleCardComponent,
		InfoNoteComponent,
	],
})
export class HelpEditorComponent
{

	public readonly faTrash = faTrash;

	public sectionsOpen = false;
	public topicsOpen = false;
	public newCategoryName = '';
	public newCategorySlug = '';

	private readonly articlesSignal = signal<HelpEditorArticle[]>([]);
	public readonly articles = this.articlesSignal.asReadonly();

	private readonly categoriesSignal = signal<HelpEditorCategory[]>([]);
	public readonly categories = this.categoriesSignal.asReadonly();

	/** Every topic a question-mark button can ask for, with the article that answers it. */
	public readonly topicGroups = computed(() => this.coverage.groups(this.articles()));

	/** Ids articles claim that no button asks for - typos and leftovers. */
	public readonly unknownTopics = computed(() => this.coverage.unknown(this.articles()));

	public readonly answeredTopics = computed(() => this.coverage.answered(this.articles()));

	public readonly totalTopics = computed(() => this.coverage.total());

	public constructor(
		private readonly api: HelpEditorApiService,
		private readonly coverage: HelpTopicCoverage,
		private readonly help: HelpManager,
		private readonly notifications: NotificationService,
	)
	{
		this.load();
	}

	public categoryName(id: string | null): string
	{
		return this.categories().find(category => category.id === id)?.name ?? 'Other';
	}

	public addCategory(): void
	{
		const name = this.newCategoryName.trim();
		const slug = this.newCategorySlug.trim() || this.slugify(name);
		if (name === '') {
			return;
		}

		this.api.createCategory({slug, name, position: this.categories().length}).subscribe({
			next: () => {
				this.newCategoryName = '';
				this.newCategorySlug = '';
				this.reload();
			},
			error: error => this.fail(error, 'The section could not be created.'),
		});
	}

	public renameCategory(category: HelpEditorCategory, name: string): void
	{
		this.api.updateCategory(category.id, {name}).subscribe({
			next: () => this.reload(),
			error: error => this.fail(error, 'The section could not be renamed.'),
		});
	}

	public moveCategory(category: HelpEditorCategory, position: number): void
	{
		this.api.updateCategory(category.id, {position: Number(position)}).subscribe({
			next: () => this.reload(),
			error: error => this.fail(error, 'The section could not be moved.'),
		});
	}

	public deleteCategory(category: HelpEditorCategory): void
	{
		if (!confirm(`Delete the section “${category.name}”? Its articles are kept.`)) {
			return;
		}
		this.api.deleteCategory(category.id).subscribe({
			next: () => this.reload(),
			error: error => this.fail(error, 'The section could not be deleted.'),
		});
	}

	public deleteArticle(article: HelpEditorArticle): void
	{
		if (!confirm(`Delete the article “${article.title}”? This cannot be undone.`)) {
			return;
		}
		this.api.deleteArticle(article.id).subscribe({
			next: () => this.reload(),
			error: error => this.fail(error, 'The article could not be deleted.'),
		});
	}

	/** For when the files on disk got out of step with the database. */
	public republish(): void
	{
		this.api.publish().subscribe({
			next: () => {
				this.help.load();
				this.notifications.showSuccess('The published help files were rebuilt.');
			},
			error: error => this.fail(error, 'The help files could not be rebuilt.'),
		});
	}

	private load(): void
	{
		this.api.listArticles().subscribe({
			next: articles => this.articlesSignal.set(articles),
			error: error => this.fail(error, 'The articles could not be loaded.'),
		});
		this.api.listCategories().subscribe({
			next: categories => this.categoriesSignal.set(categories),
			error: error => this.fail(error, 'The sections could not be loaded.'),
		});
	}

	/** Every write rebuilds the snapshot, so the reader's index is stale too. */
	private reload(): void
	{
		this.load();
		this.help.load();
	}

	private slugify(name: string): string
	{
		return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	}

	private fail(error: unknown, fallback: string): void
	{
		const message = (error as {error?: {error?: string}})?.error?.error;
		this.notifications.show(message !== undefined && message !== '' ? message : fallback);
	}

}
