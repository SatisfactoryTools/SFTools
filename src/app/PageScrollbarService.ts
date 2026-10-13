import {Injectable} from '@angular/core';

/** A classic page scrollbar narrows the layout when it appears, shifting everything sideways. While the page has none, the stylesheet pads the body and navbar by its width (zero where scrollbars overlay the page), so the layout keeps one width either way. Chrome will not let the page paint into a `scrollbar-gutter` reservation, so the space is reserved by our own elements instead. */
@Injectable({providedIn: 'root'})
export class PageScrollbarService
{

	public start(): void
	{
		this.measureWidth();
		// Callbacks run after layout but before paint, so the padding swap never shows a shifted frame.
		new ResizeObserver(() => this.update()).observe(document.body, {box: 'border-box'});
		// Zoom changes the scrollbar's width in CSS pixels and fires resize.
		window.addEventListener('resize', () => {
			this.measureWidth();
			this.update();
		});
	}

	private measureWidth(): void
	{
		const probe = document.createElement('div');
		probe.style.cssText = 'position: absolute; top: -9999px; width: 100px; height: 100px; overflow: scroll;';
		document.body.appendChild(probe);
		document.documentElement.style.setProperty('--scrollbar-width', `${probe.offsetWidth - probe.clientWidth}px`);
		probe.remove();
	}

	private update(): void
	{
		const root = document.documentElement;
		root.classList.toggle('no-page-scrollbar', window.innerWidth - root.clientWidth === 0);
	}

}
