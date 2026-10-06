import {Component, ChangeDetectionStrategy, HostListener} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faPlugCircleXmark} from '@fortawesome/free-solid-svg-icons';
import {HelpImageViewerComponent} from '@src/Components/Help/HelpImageViewerComponent';
import {DesktopUpdateBannerComponent} from '@src/Components/Root/DesktopUpdateBannerComponent';
import {OpenInDesktopComponent} from '@src/Components/Root/OpenInDesktopComponent';
import {ServerStatusService} from '@src/Model/API/ServerStatusService';
import {AnalyticsService} from '@src/Model/Analytics/AnalyticsService';
import {DesktopIntegrationService} from '@src/Model/Desktop/DesktopIntegrationService';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';
import {HotkeyService} from '@src/Model/Hotkeys/HotkeyService';

@Component({
    selector: 'root',
    templateUrl: './RootComponent.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        RouterOutlet,
        FaIconComponent,
        HelpImageViewerComponent,
        DesktopUpdateBannerComponent,
        OpenInDesktopComponent,
    ]
})
export class RootComponent
{

    public readonly faPlugCircleXmark = faPlugCircleXmark;

    public constructor(
        public readonly serverStatus: ServerStatusService,
        private readonly hotkeys: HotkeyService,
        // Injected for its side effect: it starts listening to the router here, so every navigation is counted.
        analytics: AnalyticsService,
        public readonly connectivity: ConnectivityService,
        desktopIntegration: DesktopIntegrationService,
    )
    {
        // A no-op on the website.
        desktopIntegration.start();
    }

    /** A desktop with a touch screen reports `hover: hover`, so the stylesheets key hover-only controls off this class rather than the media query. */
    @HostListener('document:touchstart')
    public onTouchStart(): void
    {
        document.body.classList.add('touch-input');
    }

    /** Keys no action claims are left to the browser. */
    @HostListener('document:keydown', ['$event'])
    public onKeyDown(event: KeyboardEvent): void
    {
        if (this.hotkeys.handle(event)) {
            event.preventDefault();
        }
    }

}
