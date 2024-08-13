import {Component, ChangeDetectionStrategy} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronLeft} from '@fortawesome/free-solid-svg-icons';
import {ModsApiService} from '@src/Model/API/ModsApiService';
import {Mod} from '@src/Model/API/Schema/Mods/Mod';
import {ModVersion} from '@src/Model/API/Schema/Mods/ModVersion';

/**
 * One mod: rename / visibility / deletion for the owner, plus its version
 * list - creating versions, renaming them, clearing their data and jumping
 * into the mod editor to edit the data itself. Read-only for public mods of
 * other users.
 */
@Component({
	templateUrl: './ModDetailComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [DatePipe, FaIconComponent, FormsModule, RouterLink],
})
export class ModDetailComponent
{

	public readonly faChevronLeft = faChevronLeft;

	public mod: Mod | null = null;
	public loading = true;
	public notFound = false;
	public error: string | null = null;

	public nameDraft = '';
	public savingName = false;

	public newVersionName = '';
	public creatingVersion = false;

	/** Id of the version whose name is being edited inline. */
	public renamingVersionId: string | null = null;
	public renameDraft = '';

	private readonly modId: string;

	public constructor(
		private readonly modsApi: ModsApiService,
		private readonly router: Router,
		route: ActivatedRoute,
	)
	{
		this.modId = route.snapshot.paramMap.get('modId') ?? '';
		this.reload();
	}

	private reload(): void
	{
		this.modsApi.getMod(this.modId).subscribe({
			next: mod => {
				this.mod = mod;
				this.nameDraft = mod.name;
				this.loading = false;
			},
			error: () => {
				this.notFound = true;
				this.loading = false;
			},
		});
	}

	public saveName(): void
	{
		const mod = this.mod;
		const name = this.nameDraft.trim();
		if (!mod || name === '' || name === mod.name || this.savingName) {
			return;
		}
		this.savingName = true;
		this.modsApi.updateMod(mod.id, {name}).subscribe({
			next: updated => {
				this.mod = updated;
				this.nameDraft = updated.name;
				this.savingName = false;
			},
			error: () => {
				this.error = 'Could not rename the mod.';
				this.savingName = false;
			},
		});
	}

	public deleteMod(): void
	{
		const mod = this.mod;
		if (!mod || !confirm(`Delete mod "${mod.name}" with all its versions? Custom versions already using it keep working.`)) {
			return;
		}
		this.modsApi.deleteMod(mod.id).subscribe({
			next: () => void this.router.navigate(['/mods']),
			error: () => this.error = 'Could not delete the mod.',
		});
	}

	public addVersion(): void
	{
		const name = this.newVersionName.trim();
		if (!this.mod || name === '' || this.creatingVersion) {
			return;
		}
		this.creatingVersion = true;
		this.modsApi.createModVersion(this.mod.id, name, null).subscribe({
			next: () => {
				this.newVersionName = '';
				this.creatingVersion = false;
				this.reload();
			},
			error: (err: {error?: {error?: string}}) => {
				this.error = err?.error?.error ?? 'Could not create the version.';
				this.creatingVersion = false;
			},
		});
	}

	public startRename(version: ModVersion): void
	{
		this.renamingVersionId = version.id;
		this.renameDraft = version.name;
	}

	public applyRename(version: ModVersion): void
	{
		const name = this.renameDraft.trim();
		this.renamingVersionId = null;
		if (!this.mod || name === '' || name === version.name) {
			return;
		}
		this.modsApi.updateModVersion(this.mod.id, version.id, {name}).subscribe({
			next: () => this.reload(),
			error: () => this.error = 'Could not rename the version.',
		});
	}

	public clearData(version: ModVersion): void
	{
		if (!this.mod || !confirm(`Remove the uploaded data of version "${version.name}"? The version itself stays.`)) {
			return;
		}
		this.modsApi.updateModVersion(this.mod.id, version.id, {data: null}).subscribe({
			next: () => this.reload(),
			error: () => this.error = 'Could not clear the data.',
		});
	}

	public deleteVersion(version: ModVersion): void
	{
		if (!this.mod || !confirm(`Delete version "${version.name}"${version.hasData ? ' and its data' : ''}?`)) {
			return;
		}
		this.modsApi.deleteModVersion(this.mod.id, version.id).subscribe({
			next: () => this.reload(),
			error: () => this.error = 'Could not delete the version.',
		});
	}

}
