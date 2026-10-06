import {Injectable, Signal, signal} from '@angular/core';
import {ModImage} from '@src/Model/ModEditor/ModImage';

/** The upload endpoint does not exist yet, so picked images live in the session under placeholder ids. */
@Injectable({providedIn: 'root'})
export class ModImageStore
{

	private readonly imagesSignal = signal<ModImage[]>([]);
	public readonly images: Signal<ModImage[]> = this.imagesSignal.asReadonly();

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
