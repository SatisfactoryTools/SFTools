import {Component, ChangeDetectionStrategy, ElementRef, ViewChild, computed, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faTrash, faUpRightFromSquare} from '@fortawesome/free-solid-svg-icons';
import {BackLinkComponent} from '@src/Components/Common/BackLinkComponent';
import {CollapsedSectionsService} from '@src/Components/Common/CollapsedSectionsService';
import {CollapsibleSections} from '@src/Components/Common/CollapsibleSections';
import {CollapsibleCardComponent} from '@src/Components/Common/CollapsibleCardComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {HelpArticleHeaderComponent} from '@src/Components/Help/HelpArticleHeaderComponent';
import {HelpContentComponent} from '@src/Components/Help/HelpContentComponent';
import {HelpNavigation} from '@src/Components/Help/HelpNavigation';
import {PageHelpNavigation} from '@src/Components/Help/PageHelpNavigation';
import {HelpTopicEntry} from '@src/Components/HelpEditor/HelpTopicEntry';
import {HelpApiService} from '@src/Model/API/HelpApiService';
import {HelpEditorApiService} from '@src/Model/API/HelpEditorApiService';
import {HelpArticleSection} from '@src/Model/API/Schema/Help/HelpArticleSection';
import {HelpEditorArticle} from '@src/Model/API/Schema/Help/HelpEditorArticle';
import {HelpEditorArticleInput} from '@src/Model/API/Schema/Help/HelpEditorArticleInput';
import {HelpEditorCategory} from '@src/Model/API/Schema/Help/HelpEditorCategory';
import {HelpEditorImage} from '@src/Model/API/Schema/Help/HelpEditorImage';
import {HelpManager} from '@src/Model/Help/HelpManager';
import {HelpTopicCatalog} from '@src/Model/Help/HelpTopicCatalog';
import {HelpTopicCoverage} from '@src/Model/Help/HelpTopicCoverage';
import {HelpTopicStatus} from '@src/Model/Help/HelpTopicStatus';
import {HelpMarkdownRenderer} from '@src/Model/Help/HelpMarkdownRenderer';
import {NotificationService} from '@src/Model/NotificationService';

/**
 * Writes one article: the metadata on the left, the Markdown and its live
 * preview on the right. The preview is the reader's own component, so what is
 * written here is exactly what readers get.
 */
@Component({
	templateUrl: './HelpArticleEditorComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	// The preview renders article links, which need a host to resolve against;
	// on this page they lead to the fullscreen reader.
	providers: [{provide: HelpNavigation, useClass: PageHelpNavigation}],
	imports: [
		FormsModule,
		RouterLink,
		FaIconComponent,
		BackLinkComponent,
		CollapsibleCardComponent,
		InfoNoteComponent,
		HelpArticleHeaderComponent,
		HelpContentComponent,
	],
	styles: `
		/* Both panes are as tall as the screen allows and scroll on their own,
		   so the text and its preview stay side by side while writing. */
		textarea.body,
		.preview {
			height: calc(100vh - 19rem);
			min-height: 28rem;
		}
		textarea.body {
			font-family: var(--bs-font-monospace);
			font-size: 0.85rem;
			resize: vertical;
		}
		.preview {
			border: 1px solid #2b3444;
			border-radius: 4px;
			padding: 1rem 1.1rem;
			overflow-y: auto;
			/* The reader names this container too - the title shrinks with the
			   column, exactly as it does in a docked help panel. */
			container-type: inline-size;
			container-name: article;
		}
		/* The reading measure the reader gives an article. */
		.preview > * {
			max-width: 74ch;
		}
		/* The id is the longer of the two, so it gets the larger share. */
		.topic-row select {
			min-width: 0;
		}
		.topic-row .topic-select {
			flex: 3 1 0;
		}
		.topic-row .anchor-select {
			flex: 2 1 0;
		}
		.media-item {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.25rem 0;
		}
		.media-item img {
			width: 48px;
			height: 36px;
			object-fit: cover;
			border: 1px solid #2b3444;
			border-radius: 3px;
		}
	`,
})
export class HelpArticleEditorComponent
{

	public readonly faTrash = faTrash;
	public readonly faUpRightFromSquare = faUpRightFromSquare;

	/** Null until an existing article is loaded; stays null for a new one. */
	private readonly articleSignal = signal<HelpEditorArticle | null>(null);

	public title = '';
	public slug = '';
	public summary = '';
	public keywords = '';
	public seeAlso = '';
	public category: string | null = null;
	public position = 0;
	public published = false;

	public readonly body = signal('');
	public readonly topics = signal<HelpTopicEntry[]>([]);
	public readonly categories = signal<HelpEditorCategory[]>([]);
	public readonly images = signal<HelpEditorImage[]>([]);
	public readonly saving = signal(false);

	/**
	 * Fold state of the details card, reached through `detailsOpen` below
	 * because the default depends on whether the article is new.
	 */
	private readonly foldState: CollapsibleSections;

	/** Whether the slug still follows the title, as it does until it is edited by hand. */
	private slugTouched = false;

	@ViewChild('bodyInput') private bodyInput: ElementRef<HTMLTextAreaElement> | undefined;

	public readonly isNew = computed(() => this.articleSignal() === null);

	/** Headings of the current body, offered as targets for help topics. */
	public readonly sections = computed<HelpArticleSection[]>(() => this.renderer.sections(this.body()));

	/** Every article, so the topic list can say which topics are already taken. */
	private readonly allArticles = signal<HelpEditorArticle[]>([]);

	/** Slugs of every other article, for the see-also autocomplete. */
	public readonly knownSlugs = computed<string[]>(() => this.allArticles().map(article => article.slug));

	/** Every topic a button can ask for, grouped, with the article that answers it. */
	public readonly topicGroups = computed(() => this.coverage.groups(this.allArticles()));

	public constructor(
		private readonly api: HelpEditorApiService,
		private readonly coverage: HelpTopicCoverage,
		private readonly files: HelpApiService,
		private readonly renderer: HelpMarkdownRenderer,
		private readonly help: HelpManager,
		private readonly notifications: NotificationService,
		private readonly route: ActivatedRoute,
		private readonly router: Router,
		collapsedSections: CollapsedSectionsService,
	)
	{
		this.foldState = new CollapsibleSections(collapsedSections, 'help-article');
		this.api.listCategories().subscribe({
			next: categories => this.categories.set(categories),
			error: () => undefined,
		});
		this.api.listArticles().subscribe({
			next: articles => this.allArticles.set(articles),
			error: () => undefined,
		});
		this.loadImages();

		const id = this.route.snapshot.paramMap.get('id');
		if (id !== null && id !== 'new') {
			this.api.getArticle(id).subscribe({
				next: article => this.fill(article),
				error: () => this.notifications.show('That article could not be loaded.'),
			});
		}
	}

	/**
	 * A new article opens with its details showing; an existing one starts
	 * folded away, because the text is what the writer came for. Either way
	 * the writer's own choice wins once they make one.
	 */
	public get detailsOpen(): boolean
	{
		return this.foldState.isOpen('details', this.isNew());
	}

	public toggleDetails(): void
	{
		this.foldState.toggle('details', this.isNew());
	}

	/** Section name for the preview's header and the folded card's summary. */
	public categoryName(): string
	{
		return this.categories().find(option => option.id === this.category)?.name ?? '';
	}

	public onTitleChange(value: string): void
	{
		this.title = value;
		if (!this.slugTouched && this.isNew()) {
			this.slug = this.slugify(value);
		}
	}

	public onSlugChange(value: string): void
	{
		this.slugTouched = true;
		this.slug = value;
	}

	public addTopic(): void
	{
		this.topics.update(topics => [...topics, {topic: '', anchor: ''}]);
	}

	public setTopic(index: number, topic: string): void
	{
		this.topics.update(topics => topics.map((entry, i) => i === index ? {...entry, topic} : entry));
	}

	public setTopicAnchor(index: number, anchor: string): void
	{
		this.topics.update(topics => topics.map((entry, i) => i === index ? {...entry, anchor} : entry));
	}

	/** Whether another article already answers this topic - the backend refuses a second claim. */
	public takenElsewhere(status: HelpTopicStatus): boolean
	{
		return status.claim !== null && status.claim.id !== this.articleSignal()?.id;
	}

	/** Where the button for a topic sits, shown under the picked one. */
	public topicWhere(topic: string): string
	{
		return HelpTopicCatalog.definition(topic)?.where ?? '';
	}

	/** An id no button asks for - kept as an option so an old claim stays visible. */
	public isUnknownTopic(topic: string): boolean
	{
		return topic !== '' && !HelpTopicCatalog.knows(topic);
	}

	public removeTopic(index: number): void
	{
		this.topics.update(topics => topics.filter((entry, i) => i !== index));
	}

	public save(): void
	{
		const article = this.articleSignal();
		const input = this.input();
		this.saving.set(true);

		const request = article === null
			? this.api.createArticle(input)
			: this.api.updateArticle(article.id, input);

		request.subscribe({
			next: saved => {
				this.saving.set(false);
				this.fill(saved);
				// Published state and the manifest both changed under the reader.
				this.help.load();
				this.notifications.showSuccess('Article saved.');
				if (article === null) {
					void this.router.navigate(['/help/editor', saved.id], {replaceUrl: true});
				}
			},
			error: error => {
				this.saving.set(false);
				this.fail(error, 'The article could not be saved.');
			},
		});
	}

	public deleteArticle(): void
	{
		const article = this.articleSignal();
		if (article === null || !confirm(`Delete the article “${article.title}”? This cannot be undone.`)) {
			return;
		}

		this.api.deleteArticle(article.id).subscribe({
			next: () => {
				this.help.load();
				void this.router.navigate(['/help/editor']);
			},
			error: error => this.fail(error, 'The article could not be deleted.'),
		});
	}

	public insertCallout(kind: string): void
	{
		this.insert(`\n:::${kind}\n`, '\n:::\n');
	}

	public insertArticleLink(): void
	{
		this.insert('[', '](help:some-article)', 'text');
	}

	public insertPanelLink(): void
	{
		this.insert('[', '](panel:overview)', 'the Overview panel');
	}

	public insertHotkey(): void
	{
		this.insert('`hotkey:', '`', 'planner.calculate');
	}

	/** The uploaded file itself, for the media list's thumbnails. */
	public imageUrl(image: HelpEditorImage): string
	{
		return this.files.assetUrl(image.path);
	}

	/**
	 * Inserts a snippet at the caret - the toolbar's one job. Whatever is
	 * selected is kept and ends up between `before` and `after`, so a button
	 * wraps the highlighted text instead of throwing it away; with nothing
	 * selected the placeholder goes in and stays selected, ready to type over.
	 */
	public insert(before: string, after: string = '', placeholder: string = ''): void
	{
		const input = this.bodyInput?.nativeElement;
		const body = this.body();
		const start = input === undefined ? body.length : input.selectionStart;
		const end = input === undefined ? body.length : input.selectionEnd;
		const selected = body.slice(start, end);
		const inner = selected === '' ? placeholder : selected;

		this.body.set(body.slice(0, start) + before + inner + after + body.slice(end));
		if (input === undefined) {
			return;
		}

		// Once Angular has written the value back: the caret goes behind text
		// that was already there, and a placeholder is left selected.
		const caret = start + before.length + inner.length;
		const from = selected === '' ? start + before.length : caret;
		requestAnimationFrame(() => {
			input.focus();
			input.setSelectionRange(from, caret);
		});
	}

	public onPaste(event: ClipboardEvent): void
	{
		const file = [...(event.clipboardData?.items ?? [])]
			.find(item => item.type.startsWith('image/'))
			?.getAsFile();
		if (file !== null && file !== undefined) {
			event.preventDefault();
			this.upload(file);
		}
	}

	public onFileSelected(event: Event): void
	{
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file !== undefined) {
			this.upload(file);
		}
		input.value = '';
	}

	public insertImage(image: HelpEditorImage): void
	{
		this.insert('![', `](${image.path} "")`, image.fileName);
	}

	public deleteImage(image: HelpEditorImage): void
	{
		if (!confirm(`Delete ${image.fileName}? Articles using it will show a broken image.`)) {
			return;
		}
		this.api.deleteImage(image.id).subscribe({
			next: () => this.loadImages(),
			error: error => this.fail(error, 'The image could not be deleted.'),
		});
	}

	/** Where the reader shows this article, for the "open" button. */
	public readerLink(): string[]
	{
		return ['/help', this.slug];
	}

	private upload(file: File): void
	{
		if (file.size > 4 * 1024 * 1024) {
			this.notifications.show('That image is larger than 4 MB.');
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			this.api.uploadImage(file.name, String(reader.result)).subscribe({
				next: image => {
					this.loadImages();
					this.insertImage(image);
				},
				error: error => this.fail(error, 'The image could not be uploaded.'),
			});
		};
		reader.readAsDataURL(file);
	}

	private loadImages(): void
	{
		this.api.listImages().subscribe({
			next: images => this.images.set(images),
			error: () => undefined,
		});
	}

	private fill(article: HelpEditorArticle): void
	{
		this.articleSignal.set(article);
		this.title = article.title;
		this.slug = article.slug;
		this.slugTouched = true;
		this.summary = article.summary;
		this.keywords = article.keywords.join(', ');
		this.seeAlso = article.seeAlso.join(', ');
		this.category = article.category;
		this.position = article.position;
		this.published = article.published;
		this.body.set(article.body ?? '');
		this.topics.set(Object.entries(article.topics).map(([topic, anchor]) => ({topic, anchor})));
	}

	private input(): HelpEditorArticleInput
	{
		const topics: Record<string, string> = {};
		for (const entry of this.topics()) {
			const topic = entry.topic.trim();
			if (topic !== '') {
				topics[topic] = entry.anchor;
			}
		}

		return {
			slug: this.slug.trim(),
			title: this.title.trim(),
			summary: this.summary.trim(),
			body: this.body(),
			keywords: this.list(this.keywords),
			seeAlso: this.list(this.seeAlso),
			topics,
			category: this.category,
			position: Number(this.position),
			published: this.published,
		};
	}

	private list(value: string): string[]
	{
		return value.split(',').map(item => item.trim()).filter(item => item !== '');
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
