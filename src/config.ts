import {ApplicationConfig, isDevMode, importProvidersFrom} from '@angular/core';
import {HTTP_INTERCEPTORS, provideHttpClient, withFetch, withInterceptorsFromDi} from '@angular/common/http';
import {TitleStrategy, provideRouter, withComponentInputBinding, withInMemoryScrolling} from '@angular/router';
import {AppPositioningService} from '@src/AppPositioningService';
import {AppTooltipConfig} from '@src/AppTooltipConfig';
import {AuthInterceptor} from '@src/Model/Auth/AuthInterceptor';
import {RetryInterceptor} from '@src/Model/API/RetryInterceptor';
import {ConnectivityInterceptor} from '@src/Model/Network/ConnectivityInterceptor';
import {OfflineCacheInterceptor} from '@src/Model/Network/OfflineCacheInterceptor';
import {AppTitleStrategy} from '@src/Model/Meta/AppTitleStrategy';
import {RouteList} from '@src/RouteList';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {CollapseModule} from 'ngx-bootstrap/collapse';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {PositioningService} from 'ngx-bootstrap/positioning';
import {TooltipConfig} from 'ngx-bootstrap/tooltip';

export const config: ApplicationConfig = {
	providers: [
		// Otherwise a long codex page opened from far down another one starts scrolled to its end.
		provideRouter(
			RouteList.routes,
			withComponentInputBinding(),
			withInMemoryScrolling({scrollPositionRestoration: 'enabled'}),
		),
		provideHttpClient(withFetch(), withInterceptorsFromDi()),
		// Order matters: the offline cache answers before anything is retried, connectivity sees every attempt, and the retry sits outside the auth handling so a retried request re-runs the token logic.
		{provide: HTTP_INTERCEPTORS, useClass: OfflineCacheInterceptor, multi: true},
		{provide: HTTP_INTERCEPTORS, useClass: RetryInterceptor, multi: true},
		{provide: HTTP_INTERCEPTORS, useClass: ConnectivityInterceptor, multi: true},
		{provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true},
		{provide: TooltipConfig, useClass: AppTooltipConfig},
		{provide: PositioningService, useClass: AppPositioningService},
		{provide: TitleStrategy, useClass: AppTitleStrategy},
		importProvidersFrom([
			BrowserAnimationsModule,
			CollapseModule,
			BsDropdownModule,
		]),
	],
};
