import {Injectable} from '@angular/core';
import {IconDefinition, faCircleInfo, faLightbulb, faTriangleExclamation} from '@fortawesome/free-solid-svg-icons';
import {Marked, TextRenderer} from 'marked';
import {HelpApiService} from '@src/Model/API/HelpApiService';
import {HelpArticleSection} from '@src/Model/API/Schema/Help/HelpArticleSection';
import {HelpLinkResolver} from '@src/Model/Help/HelpLinkResolver';
import {HotkeyAction} from '@src/Model/Hotkeys/HotkeyAction';
import {HotkeyService} from '@src/Model/Hotkeys/HotkeyService';

/** The three tones a `:::` callout can have, with the icon each one shows. */
const CALLOUT_ICONS: Record<string, IconDefinition> = {
	note: faCircleInfo,
	warning: faTriangleExclamation,
	tip: faLightbulb,
};

/** URL schemes a link in an article may use; anything else loses its href. */
const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:'];

/**
 * Renders an article's Markdown to the HTML the reader displays.
 *
 * Raw HTML in the source is dropped rather than passed through - an article is
 * text, and nothing an editor types should be able to run - and links are
 * limited to the schemes above, so the result is safe to insert as-is.
 *
 * On top of Markdown it understands the app's own references:
 *
 *   [Manual editing](help:manual-editing#replace)  another article
 *   [Overview panel](panel:overview)               opens a planner panel
 *   `hotkey:planner.calculate`                     the user's current key for an action
 *   :::note / :::warning / :::tip … :::            a callout box
 *   ![Alt](data/help/images/x.png "caption")       a screenshot with a caption
 *
 * Heading ids are generated exactly like the backend's MarkdownSections, so the
 * anchors listed in the manifest match the ones rendered here.
 */
@Injectable({providedIn: 'root'})
export class HelpMarkdownRenderer
{

	public constructor(
		private readonly api: HelpApiService,
		private readonly hotkeys: HotkeyService,
	)
	{
	}

	public render(markdown: string, links: HelpLinkResolver): string
	{
		const html = this.marked(links).parse(markdown, {async: false});
		// The app's tables everywhere else are compact and dark; marked has no
		// hook for the opening tag alone, and rebuilding its table renderer to
		// add two classes would be far more code than this.
		return html.replace(/<table>/g, '<table class="table table-sm table-dark mb-3">');
	}

	/**
	 * The headings of a body, with the anchors they render with - the same list
	 * the backend puts in the manifest. The editor uses it to offer the
	 * sections a help topic can point at, before anything is saved.
	 */
	public sections(markdown: string): HelpArticleSection[]
	{
		const sections: HelpArticleSection[] = [];
		const used = new Map<string, number>();
		let inFence = false;

		for (const line of markdown.split(/\r\n|\r|\n/)) {
			if (/^\s*(```|~~~)/.test(line)) {
				inFence = !inFence;
				continue;
			}
			const heading = inFence ? null : /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
			if (heading === null) {
				continue;
			}

			const title = this.plainText(heading[2]);
			const id = this.uniqueAnchor(title, used);
			if (id !== '') {
				sections.push({id, title, level: heading[1].length});
			}
		}

		return sections;
	}

	/** Lowercased, spaces to dashes - mirrored from the backend. */
	public anchor(title: string): string
	{
		return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	}

	private marked(links: HelpLinkResolver): Marked
	{
		const renderer = this;
		const usedAnchors = new Map<string, number>();

		return new Marked({gfm: true}, {
			extensions: [
				{
					name: 'callout',
					level: 'block',
					start: (source: string) => source.match(/^:::/m)?.index,
					tokenizer(source: string) {
						const match = /^:::(note|warning|tip)[^\n]*\n([\s\S]*?)\n:::[^\n]*(?:\n|$)/.exec(source);
						if (match === null) {
							return undefined;
						}
						return {
							type: 'callout',
							raw: match[0],
							kind: match[1],
							tokens: this.lexer.blockTokens(match[2].trim() + '\n'),
						};
					},
					renderer(token) {
						return renderer.callout(token['kind'] as string, this.parser.parse(token.tokens ?? []));
					},
				},
			],
			renderer: {
				// Raw HTML is not content: an article is Markdown, and letting
				// tags through would be the one way to sneak script into a page.
				html: () => '',

				heading({tokens, depth}): string {
					const text = this.parser.parseInline(tokens);
					// The anchor comes from the heading's plain text, so links,
					// code and emphasis inside it do not change where it points.
					const anchor = renderer.uniqueAnchor(this.parser.parseInline(tokens, new TextRenderer()), usedAnchors);
					return `<h${depth} id="${renderer.escape(anchor)}">`
						+ renderer.sectionAnchor(anchor, links) + text
						+ `</h${depth}>\n`;
				},

				link({href, title, tokens}): string {
					return renderer.link(href, title ?? null, this.parser.parseInline(tokens), links);
				},

				image({href, title, text}): string {
					return renderer.image(href, title ?? null, text);
				},

				codespan({text}): string {
					return renderer.codespan(text);
				},
			},
		});
	}

	/**
	 * The '#' in front of a heading: a link to that very section, so a reader
	 * can copy the address of the part they are looking at.
	 */
	private sectionAnchor(anchor: string, links: HelpLinkResolver): string
	{
		if (anchor === '') {
			return '';
		}
		return `<a class="help-anchor" href="${this.escape(links.sectionHref(anchor))}"`
			+ ` data-help-section="${this.escape(anchor)}" aria-label="Link to this section">#</a>`;
	}

	/** The see-also list and the callouts reuse the app's info-note styling. */
	private callout(kind: string, content: string): string
	{
		const icon = CALLOUT_ICONS[kind] ?? faCircleInfo;
		return `<div class="help-callout help-callout-${this.escape(kind)}">`
			+ `${this.icon(icon)}<div class="help-callout-body">${content}</div></div>\n`;
	}

	private link(href: string, title: string | null, text: string, links: HelpLinkResolver): string
	{
		const titleAttribute = title !== null && title !== '' ? ` title="${this.escape(title)}"` : '';

		const article = /^help:(.+)$/.exec(href);
		if (article !== null) {
			const [slug, anchor = ''] = article[1].split('#');
			return `<a href="${this.escape(links.articleHref(slug, anchor))}" data-help-article="${this.escape(slug)}"`
				+ ` data-help-anchor="${this.escape(anchor)}"${titleAttribute}>${text}</a>`;
		}

		const panel = /^panel:(.+)$/.exec(href);
		if (panel !== null) {
			const target = links.panelHref(panel[1]);
			// No planner to point at: the panel name stays as plain text
			// instead of becoming a link that leads nowhere.
			if (target === '') {
				return text;
			}
			return `<a href="${this.escape(target)}" data-help-panel="${this.escape(panel[1])}"`
				+ `${titleAttribute}>${text}</a>`;
		}

		// An app route, e.g. /settings - handled by the router on click.
		if (href.startsWith('/')) {
			return `<a href="${this.escape(href)}" data-help-route="${this.escape(href)}"${titleAttribute}>${text}</a>`;
		}

		if (!this.isSafe(href)) {
			return text;
		}

		return `<a href="${this.escape(href)}" target="_blank" rel="noopener noreferrer"${titleAttribute}>${text}</a>`;
	}

	private image(href: string, title: string | null, alt: string): string
	{
		const source = /^[a-z][a-z0-9+.-]*:/i.test(href) ? href : this.api.assetUrl(href);
		if (!this.isSafe(source)) {
			return this.escape(alt);
		}

		const caption = title !== null && title !== ''
			? `<figcaption>${this.escape(title)}</figcaption>`
			: '';
		// Focusable: the reader opens a picture at full size when it is clicked,
		// and a keyboard should be able to do the same.
		return `<figure class="help-figure">`
			+ `<img src="${this.escape(source)}" alt="${this.escape(alt)}" loading="lazy" tabindex="0">${caption}</figure>`;
	}

	/** `hotkey:some.action` becomes the key the user has bound right now. */
	private codespan(text: string): string
	{
		const hotkey = /^hotkey:(.+)$/.exec(text);
		if (hotkey === null) {
			return `<code>${this.escape(text)}</code>`;
		}

		const label = this.hotkeys.label(hotkey[1] as HotkeyAction);
		return label === ''
			? '<span class="help-hotkey-unset">not set</span>'
			: `<kbd>${this.escape(label)}</kbd>`;
	}

	/** Heading anchors must stay unique within an article, like the backend's. */
	private uniqueAnchor(title: string, used: Map<string, number>): string
	{
		const anchor = this.anchor(title);
		const seen = (used.get(anchor) ?? 0) + 1;
		used.set(anchor, seen);
		return seen > 1 ? `${anchor}-${seen}` : anchor;
	}

	/** The visible text of a heading, without the inline Markdown around it. */
	private plainText(title: string): string
	{
		return title
			.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
			.replace(/[*_`]+/g, '')
			.trim();
	}

	private isSafe(href: string): boolean
	{
		try {
			return SAFE_PROTOCOLS.includes(new URL(href, document.baseURI).protocol);
		} catch {
			return false;
		}
	}

	private escape(text: string): string
	{
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	/** A Font Awesome icon as inline SVG - rendered HTML cannot host components. */
	private icon(icon: IconDefinition): string
	{
		const [width, height, , , path] = icon.icon;
		const paths = Array.isArray(path) ? path : [path];
		return `<svg class="help-callout-icon" viewBox="0 0 ${width} ${height}" aria-hidden="true">`
			+ paths.map(definition => `<path d="${this.escape(definition)}"/>`).join('')
			+ '</svg>';
	}

}
