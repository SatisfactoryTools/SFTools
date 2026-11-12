import {Component, ChangeDetectionStrategy} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {ModsApiService} from '@src/Model/API/ModsApiService';
import {Mod} from '@src/Model/API/Schema/Mods/Mod';
import {ModVersion} from '@src/Model/API/Schema/Mods/ModVersion';
import {BackLinkComponent} from '@src/Components/Common/BackLinkComponent';
import {ConfirmDialogService} from '@src/Components/Common/ConfirmDialogService';

@Component({
	templateUrl: './ModDetailComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [DatePipe, FormsModule, RouterLink, BackLinkComponent],
})
export class ModDetailComponent
{


	public mod: Mod | null = null;
	private visibleMods: Mod[] = [];
	public loading = true;
	public notFound = false;
	public error: string | null = null;

	public nameDraft = '';
	public savingName = false;

	public newVersionName = '';
	public creatingVersion = false;

	public renamingVersionId: string | null = null;
	public renameDraft = '';

	private readonly modId: string;

	public constructor(
		private readonly confirmDialog: ConfirmDialogService,
		private readonly modsApi: ModsApiService,
		private readonly router: Router,
		route: ActivatedRoute,
	)
	{
		this.modId = route.snapshot.paramMap.get('modId') ?? '';
		this.reload();
		this.modsApi.listMods().subscribe({
			next: mods => this.visibleMods = mods,
			// Only the names of needed mods come from this list; without it they show as hidden.
			error: () => this.visibleMods = [],
		});
	}

	public dependencyLabels(version: ModVersion): string[]
	{
		return version.dependencies.map(dependencyId => {
			for (const mod of this.visibleMods) {
				const dependency = mod.versions.find(candidate => candidate.id === dependencyId);
				if (dependency !== undefined) {
					return `${mod.name} ${dependency.name}`;
				}
			}
			return 'a mod you cannot see';
		});
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

	public async deleteMod(): Promise<void>
	{
		const mod = this.mod;
		if (!mod || !await this.confirmDialog.ask({message: `Delete mod "${mod.name}" with all its versions? Custom versions already using it keep working.`, confirmLabel: 'Delete', danger: true})) {
			return;
		}
		this.modsApi.deleteMod(mod.id).subscribe({
			next: () => void this.router.navigate(['/mods']),
			error: (err: {error?: {error?: string}}) => this.error = err?.error?.error ?? 'Could not delete the mod.',
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

	public async clearData(version: ModVersion): Promise<void>
	{
		if (!this.mod || !await this.confirmDialog.ask({message: `Clear the data of version "${version.name}"? The version stays.`, confirmLabel: 'Clear', danger: true})) {
			return;
		}
		this.modsApi.updateModVersion(this.mod.id, version.id, {data: null}).subscribe({
			next: () => this.reload(),
			error: () => this.error = 'Could not clear the data.',
		});
	}

	public async deleteVersion(version: ModVersion): Promise<void>
	{
		if (!this.mod || !await this.confirmDialog.ask({message: `Delete version "${version.name}"${version.hasData ? ' and its data' : ''}?`, confirmLabel: 'Delete', danger: true})) {
			return;
		}
		this.modsApi.deleteModVersion(this.mod.id, version.id).subscribe({
			next: () => this.reload(),
			error: (err: {error?: {error?: string}}) => this.error = err?.error?.error ?? 'Could not delete the version.',
		});
	}

}
