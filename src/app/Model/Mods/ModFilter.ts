import {Injectable, computed, signal} from '@angular/core';

@Injectable()
export class ModFilter
{

	public static readonly VANILLA = 'vanilla';

	private readonly selectedSignal = signal<ReadonlySet<string>>(new Set());
	public readonly selected = this.selectedSignal.asReadonly();

	public readonly active = computed(() => this.selectedSignal().size > 0);

	public isSelected(key: string): boolean
	{
		return this.selectedSignal().has(key);
	}

	public toggle(key: string): void
	{
		const next = new Set(this.selectedSignal());
		next.has(key) ? next.delete(key) : next.add(key);
		this.selectedSignal.set(next);
	}

	public clear(): void
	{
		this.selectedSignal.set(new Set());
	}

	public retain(keys: readonly string[]): void
	{
		const kept = [...this.selectedSignal()].filter(key => keys.includes(key));
		if (kept.length !== this.selectedSignal().size) {
			this.selectedSignal.set(new Set(kept));
		}
	}

	public matches(modId: string | null): boolean
	{
		const selected = this.selectedSignal();
		return selected.size === 0 || selected.has(modId ?? ModFilter.VANILLA);
	}

}
