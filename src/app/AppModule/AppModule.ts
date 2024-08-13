import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {RootComponent} from '@src/AppModule/Components/Root/RootComponent';
import {AppRoutingModule} from '@src/AppModule/AppRoutingModule';
import {HomeComponent} from '@src/AppModule/Components/Home/HomeComponent';
import {NotFoundComponent} from '@src/AppModule/Components/Errors/NotFoundComponent';
import {NavbarComponent} from '@src/AppModule/Components/Root/NavbarComponent';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {CollapseModule} from 'ngx-bootstrap/collapse';
import {VersionSwitcherComponent} from '@src/AppModule/Components/Version/VersionSwitcherComponent';
import {NavbarVersionSwitcherComponent} from '@src/AppModule/Components/Root/NavbarVersionSwitcherComponent';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {HttpClientModule} from '@angular/common/http';
import {ContentComponent} from '@src/AppModule/Components/Root/ContentComponent';

@NgModule({
	declarations: [
		// root
		RootComponent,
		ContentComponent,
		NavbarComponent,
		NavbarVersionSwitcherComponent,
		// pages
		HomeComponent,
		VersionSwitcherComponent,
		// errors
		NotFoundComponent,
	],
	imports: [
		BrowserModule,
		HttpClientModule,
		AppRoutingModule,

		// bootstrap
		BrowserAnimationsModule,
		CollapseModule.forRoot(),
		BsDropdownModule.forRoot(),
	],
	providers: [],
	bootstrap: [RootComponent],
})
export class AppModule
{
}
