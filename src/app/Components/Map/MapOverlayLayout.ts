/**
 * Measures the controls along the map's top and bottom edges into `--overlay-top` / `--overlay-bottom` on the host,
 * so the panels that open between them are sized to never cover them. The top bar wraps to more rows on a phone,
 * so fixed offsets cannot do it.
 */
export class MapOverlayLayout
{

	private readonly observer = new ResizeObserver(() => this.update());
	private readonly top = new Set<HTMLElement>();
	private readonly bottom = new Set<HTMLElement>();
	private readonly watched = new Map<string, HTMLElement>();

	public constructor(private readonly host: HTMLElement)
	{
		this.observer.observe(host);
	}

	/** Swaps the element measured under this key; null when it is not shown. */
	public watch(key: string, edge: 'top' | 'bottom', element: HTMLElement | null): void
	{
		const previous = this.watched.get(key);
		if (previous === element) {
			return;
		}
		if (previous !== undefined) {
			this.observer.unobserve(previous);
			this.top.delete(previous);
			this.bottom.delete(previous);
			this.watched.delete(key);
		}
		if (element !== null) {
			this.watched.set(key, element);
			(edge === 'top' ? this.top : this.bottom).add(element);
			this.observer.observe(element);
		}
		this.update();
	}

	public destroy(): void
	{
		this.observer.disconnect();
	}

	private update(): void
	{
		const host = this.host.getBoundingClientRect();
		let top = 0;
		for (const element of this.top) {
			top = Math.max(top, element.getBoundingClientRect().bottom - host.top);
		}
		let bottom = 0;
		for (const element of this.bottom) {
			bottom = Math.max(bottom, host.bottom - element.getBoundingClientRect().top);
		}
		this.host.style.setProperty('--overlay-top', `${Math.ceil(top)}px`);
		this.host.style.setProperty('--overlay-bottom', `${Math.ceil(bottom)}px`);
	}

}
