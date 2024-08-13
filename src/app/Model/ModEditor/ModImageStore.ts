import {Injectable, Signal, signal} from '@angular/core';
import {ModImage} from '@src/Model/ModEditor/ModImage';

/**
 * Session-local store for images picked in the mod editor. Icon fields in
 * the JSON reference images by id only - the files themselves will be
 * uploaded through a separate endpoint (not available yet), which will
 * replace these local ids with server-issued ones.
 */
@Injectable({providedIn: 'root'})
export class ModImageStore
{

	private readonly imagesSignal = signal<ModImage[]>([]);
	public readonly images: Signal<ModImage[]> = this.imagesSignal.asReadonly();

	/** Registers a picked file and returns the placeholder id to put into icon fields. */
	public add(file: File): string
	{
		const id = `local-${crypto.randomUUID()}`;
		const image: ModImage = {id, name: file.name, url: URL.createObjectURL(file), file};
		this.imagesSignal.update(images => [...images, image]);
		return id;
	}

	public remove(id: string): void
	{
		const image = this.find(id);
		if (image) {
			URL.revokeObjectURL(image.url);
		}
		this.imagesSignal.update(images => images.filter(candidate => candidate.id !== id));
	}

	public find(id: string | null): ModImage | null
	{
		return id === null ? null : this.imagesSignal().find(image => image.id === id) ?? null;
	}

	public urlOf(id: string | null): string | null
	{
		return this.find(id)?.url ?? null;
	}

}
