import {Component, ChangeDetectionStrategy} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronLeft} from '@fortawesome/free-solid-svg-icons';
import {ModsApiService} from '@src/Model/API/ModsApiService';
import {Mod} from '@src/Model/API/Schema/Mods/Mod';

/** All mods visible to the user - their own (manageable) and public ones - plus the create form. */
@Component({
	templateUrl: './ModListComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [DatePipe, FaIconComponent, FormsModule, RouterLink],
})
export class ModListComponent
{

	public readonly faChevronLeft = faChevronLeft;

	public mods: Mod[] = [];
	public loading = true;
	public loadError: string | null = null;

	public newName = '';
	public creating = false;
	public createError: string | null = null;

	public constructor(
		private readonly modsApi: ModsApiService,
		private readonly router: Router,
	)
	{
		this.modsApi.listMods().subscribe({
			next: mods => {
				this.mods = mods;
				this.loading = false;
			},
			error: () => {
				this.loadError = 'Could not load mods.';
				this.loading = false;
			},
		});
	}

	public get ownMods(): Mod[]
	{
		return this.mods.filter(mod => mod.owned);
	}

	public get publicMods(): Mod[]
	{
		return this.mods.filter(mod => !mod.owned);
	}

	public create(): void
	{
		const name = this.newName.trim();
		if (name === '' || this.creating) {
			this.createError = name === '' ? 'Enter a mod name first.' : null;
			return;
		}
		this.creating = true;
		this.createError = null;
		this.modsApi.createMod(name).subscribe({
			next: mod => void this.router.navigate(['/mods', mod.id]),
			error: (err: {error?: {error?: string}}) => {
				this.creating = false;
				this.createError = err?.error?.error ?? 'Could not create the mod.';
			},
		});
	}

}
