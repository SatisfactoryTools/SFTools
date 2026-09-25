import {Component, ChangeDetectionStrategy, HostListener} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {HelpImageViewerComponent} from '@src/Components/Help/HelpImageViewerComponent';
import {ServerStatusService} from '@src/Model/API/ServerStatusService';
import {HotkeyService} from '@src/Model/Hotkeys/HotkeyService';

@Component({
    selector: 'root',
    templateUrl: './RootComponent.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        RouterOutlet,
        HelpImageViewerComponent
    ]
})
export class RootComponent
{

    public constructor(
        public readonly serverStatus: ServerStatusService,
        private readonly hotkeys: HotkeyService,
    )
    {
    }

    /**
     * Marks the page as soon as it is touched. A desktop with a touch screen
     * reports `hover: hover` like any other desktop, so the media query alone
     * would keep hover-only controls (a row's three-dot menu, say) out of a
     * finger's reach - the class is what the stylesheets key those off.
     */
    @HostListener('document:touchstart')
    public onTouchStart(): void
    {
        document.body.classList.add('touch-input');
    }

    /**
     * The app's single hotkey listener. The browser keeps the key whenever no
     * action claimed it, so nothing we do not use is swallowed.
     */
    @HostListener('document:keydown', ['$event'])
    public onKeyDown(event: KeyboardEvent): void
    {
        if (this.hotkeys.handle(event)) {
            event.preventDefault();
        }
    }

}
