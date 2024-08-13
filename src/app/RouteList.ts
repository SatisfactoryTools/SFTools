import {Routes, UrlMatchResult, UrlSegment} from '@angular/router';
import {ContentComponent} from '@src/Components/Root/ContentComponent';
import {HomeComponent} from '@src/Components/Home/HomeComponent';
import {VersionContextComponent} from '@src/Components/Version/VersionContextComponent';
import {CodexPageComponent} from '@src/Components/Codex/CodexPageComponent';
import {AboutComponent} from '@src/Components/About/AboutComponent';
import {CreateVersionPageComponent} from '@src/Components/Versions/CreateVersionPageComponent';
import {ModDetailComponent} from '@src/Components/Mods/ModDetailComponent';
import {ModEditorComponent} from '@src/Components/ModEditor/ModEditorComponent';
import {ModListComponent} from '@src/Components/Mods/ModListComponent';
import {PlannerComponent} from '@src/Components/Planner/PlannerComponent';
import {SettingsComponent} from '@src/Components/Settings/SettingsComponent';
import {ShareViewComponent} from '@src/Components/Shares/ShareViewComponent';
import {AuthGuard} from '@src/Model/Auth/AuthGuard';
import {NotFoundComponent} from '@src/Components/Errors/NotFoundComponent';
import {VersionsResolver} from '@src/Model/Data/VersionsResolver';
import {VersionDataResolver} from '@src/Model/Data/VersionDataResolver';
import {SettingsResolver} from '@src/Model/Settings/SettingsResolver';
import {LoginComponent} from '@src/Components/Auth/LoginComponent';
import {OAuthCallbackComponent} from '@src/Components/Auth/OAuthCallbackComponent';
import {RegisterComponent} from '@src/Components/Auth/RegisterComponent';
import {ForgotPasswordComponent} from '@src/Components/Auth/ForgotPasswordComponent';
import {ResetPasswordComponent} from '@src/Components/Auth/ResetPasswordComponent';
import {AccountComponent} from '@src/Components/Account/AccountComponent';

export class RouteList
{

	/**
	 * 'codex' plus any codex path after it - one route, so browsing within the
	 * fullscreen codex reuses the component; CodexPageComponent reads the path
	 * from the consumed segments.
	 */
	public static codexMatcher(segments: UrlSegment[]): UrlMatchResult | null
	{
		if (segments.length < 1 || segments[0].path !== 'codex') {
			return null;
		}
		return {consumed: segments, posParams: {}};
	}

	public static plannerMatcher(segments: UrlSegment[]): UrlMatchResult | null
	{
		if (segments.length < 1 || segments.length > 2 || segments[0].path !== 'planner') {
			return null;
		}
		const posParams: Record<string, UrlSegment> = {};
		if (segments.length === 2) {
			posParams['planId'] = segments[1];
		}
		return {consumed: segments, posParams};
	}

	public static routes: Routes = [
		{
			path: '',
			component: ContentComponent,
			resolve: {
				versions: VersionsResolver,
				settings: SettingsResolver,
			},
			children: [
				{
					path: '',
					component: HomeComponent,
				},
				{
					// Global settings - not scoped to a game version.
					path: 'settings',
					component: SettingsComponent,
				},
				{
					path: 'about',
					component: AboutComponent,
				},
				{
					path: 'create-version',
					canActivate: [AuthGuard],
					component: CreateVersionPageComponent,
				},
				// Mod management - signed-in users only. All of these must
				// precede the ':versionSlug' catch-all.
				{
					path: 'mods',
					canActivate: [AuthGuard],
					children: [
						{
							path: '',
							component: ModListComponent,
						},
						{
							path: ':modId',
							component: ModDetailComponent,
						},
						{
							path: ':modId/versions/:modVersionId/data',
							component: ModEditorComponent,
						},
					],
				},
				{
					// Standalone mod data scratchpad (produces JSON only).
					path: 'mod-editor',
					component: ModEditorComponent,
				},
				{
					path: 'auth',
					children: [
						{
							path: 'login',
							component: LoginComponent,
						},
						{
							path: 'register',
							component: RegisterComponent,
						},
						{
							path: 'forgot-password',
							component: ForgotPasswordComponent,
						},
						{
							path: 'reset-password',
							component: ResetPasswordComponent,
						},
						{
							// OAuth providers redirect here; the page forwards
							// the query string to the backend callback.
							path: 'callback/:provider',
							component: OAuthCallbackComponent,
						},
					],
				},
				{
					// Sign-in methods management (connected accounts).
					path: 'account',
					canActivate: [AuthGuard],
					component: AccountComponent,
				},
				{
					// Public share links - no auth, must precede the
					// ':versionSlug' catch-all.
					path: 'shared/:shareId',
					component: ShareViewComponent,
				},
				{
					path: ':versionSlug',
					component: VersionContextComponent,
					resolve: {
						versionData: VersionDataResolver,
					},
					children: [
						{
							// The planner is the version's home page.
							path: '',
							redirectTo: 'planner',
							pathMatch: 'full',
						},
						{
							matcher: RouteList.codexMatcher,
							component: CodexPageComponent,
						},
						{
							// 'planner' with an optional ':planId' - one route, so switching
							// plans only changes the param and reuses the component.
							matcher: RouteList.plannerMatcher,
							component: PlannerComponent,
						},
						{
							path: '**',
							component: NotFoundComponent,
						},
					],
				},
				{
					path: '**',
					component: NotFoundComponent,
				},
			],
		},
	];

}
