import {Component, ChangeDetectionStrategy} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowUpRightFromSquare, faPuzzlePiece, faSliders} from '@fortawesome/free-solid-svg-icons';
import {BackLinkComponent} from '@src/Components/Common/BackLinkComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {ModCatalogEntry} from '@src/Model/API/Schema/Mods/ModCatalogEntry';
import {ModSuggestionResult} from '@src/Model/API/Schema/Mods/ModSuggestionResult';
import {CommunityLinks} from '@src/Model/CommunityLinks';
import {FicsitModLink} from '@src/Model/Mods/FicsitModLink';
import {ModCatalogService} from '@src/Model/Mods/ModCatalogService';

@Component({
	templateUrl: './SupportedModsComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [DatePipe, FormsModule, RouterLink, FaIconComponent, BackLinkComponent, InfoNoteComponent],
	styles: [`
		.suggest-form {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
		}
		.suggest-form input {
			flex: 1 1 18rem;
			min-width: 0;
		}
		.suggest-notes {
			display: grid;
			gap: 0.4rem;
		}
		.mod-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr));
			gap: 0.75rem;
		}
		.mod-card {
			display: flex;
			gap: 0.85rem;
			padding: 0.85rem 1rem;
			background: var(--bs-dark);
			border: 1px solid #4e5d6c;
			border-left: 4px solid #9c27b0;
		}
		.mod-logo {
			width: 56px;
			height: 56px;
			flex-shrink: 0;
			object-fit: cover;
			background: rgba(255, 255, 255, 0.04);
		}
		.mod-logo-empty {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			color: #9fb0c0;
			font-size: 1.4rem;
		}
		.mod-body {
			flex-grow: 1;
			min-width: 0;
		}
		.mod-name {
			font-weight: 600;
			font-size: 1.05rem;
			overflow-wrap: anywhere;
		}
		.mod-version {
			font-size: 0.8rem;
			color: #9fb0c0;
		}
		.mod-summary {
			font-size: 0.875rem;
			color: #c5d0db;
			margin: 0.35rem 0;
			overflow-wrap: anywhere;
		}
		.mod-facts {
			font-size: 0.8rem;
			color: #9fb0c0;
		}
		.mod-link {
			display: inline-flex;
			align-items: center;
			gap: 0.35rem;
			font-size: 0.85rem;
			margin-top: 0.35rem;
		}
	`],
})
export class SupportedModsComponent
{

	public readonly faArrowUpRightFromSquare = faArrowUpRightFromSquare;
	public readonly faPuzzlePiece = faPuzzlePiece;
	public readonly faSliders = faSliders;
	public readonly discord = CommunityLinks.DISCORD;
	public readonly exampleLink = FicsitModLink.EXAMPLE;

	public link = '';
	public sending = false;
	public result: ModSuggestionResult | null = null;
	public error: string | null = null;

	public constructor(protected readonly catalog: ModCatalogService)
	{
		this.catalog.load(true);
	}

	public get entries(): ModCatalogEntry[]
	{
		return this.catalog.entries() ?? [];
	}

	public ficsitUrl(reference: string): string
	{
		return FicsitModLink.url(reference);
	}

	public counts(entry: ModCatalogEntry): string
	{
		return [
			this.countLabel(entry.counts.items, 'item', 'items'),
			this.countLabel(entry.counts.recipes, 'recipe', 'recipes'),
			this.countLabel(entry.counts.buildings, 'building', 'buildings'),
			this.countLabel(entry.counts.schematics, 'schematic', 'schematics'),
		].filter(label => label !== '').join(' · ');
	}

	public suggest(): void
	{
		if (this.sending) {
			return;
		}
		this.result = null;
		if (FicsitModLink.parse(this.link) === null) {
			this.error = `That is not a ficsit.app mod link. It should look like ${FicsitModLink.EXAMPLE}`;
			return;
		}
		this.error = null;
		this.sending = true;
		this.catalog.suggest(this.link.trim()).subscribe({
			next: result => {
				this.sending = false;
				this.result = result;
				if (result.status !== 'available') {
					this.link = '';
				}
			},
			error: (err: {error?: {error?: string}}) => {
				this.sending = false;
				this.error = err?.error?.error ?? 'Could not send your suggestion. Please try again later.';
			},
		});
	}

	private countLabel(count: number, singular: string, plural: string): string
	{
		return count > 0 ? `${count} ${count === 1 ? singular : plural}` : '';
	}

	public resultName(result: ModSuggestionResult): string
	{
		return result.name ?? result.reference;
	}

}
