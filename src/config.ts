import {ApplicationConfig, isDevMode, importProvidersFrom} from '@angular/core';
import {HTTP_INTERCEPTORS, provideHttpClient, withFetch, withInterceptorsFromDi} from '@angular/common/http';
import {provideRouter, withComponentInputBinding} from '@angular/router';
import {AppTooltipConfig} from '@src/AppTooltipConfig';
import {AuthInterceptor} from '@src/Model/Auth/AuthInterceptor';
import {RouteList} from '@src/RouteList';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {CollapseModule} from 'ngx-bootstrap/collapse';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {TooltipConfig} from 'ngx-bootstrap/tooltip';

export const config: ApplicationConfig = {
	providers: [
		provideRouter(RouteList.routes, withComponentInputBinding()),
		provideHttpClient(withFetch(), withInterceptorsFromDi()),
		{provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true},
		{provide: TooltipConfig, useClass: AppTooltipConfig},
		importProvidersFrom([
			BrowserAnimationsModule,
			CollapseModule,
			BsDropdownModule,
		]),
	],
};
