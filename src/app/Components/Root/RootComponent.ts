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
