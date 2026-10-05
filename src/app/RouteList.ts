import {Routes, UrlMatchResult, UrlSegment} from '@angular/router';
import {ContentComponent} from '@src/Components/Root/ContentComponent';
import {HomeComponent} from '@src/Components/Home/HomeComponent';
import {VersionContextComponent} from '@src/Components/Version/VersionContextComponent';
import {CodexPageComponent} from '@src/Components/Codex/CodexPageComponent';
import {HelpPageComponent} from '@src/Components/Help/HelpPageComponent';
import {HelpArticleEditorComponent} from '@src/Components/HelpEditor/HelpArticleEditorComponent';
import {HelpEditorComponent} from '@src/Components/HelpEditor/HelpEditorComponent';
import {AboutComponent} from '@src/Components/About/AboutComponent';
import {CreateVersionPageComponent} from '@src/Components/Versions/CreateVersionPageComponent';
import {ModDetailComponent} from '@src/Components/Mods/ModDetailComponent';
import {ModEditorComponent} from '@src/Components/ModEditor/ModEditorComponent';
import {ModListComponent} from '@src/Components/Mods/ModListComponent';
import {PlannerComponent} from '@src/Components/Planner/PlannerComponent';
import {SettingsComponent} from '@src/Components/Settings/SettingsComponent';
import {ShareRedirectComponent} from '@src/Components/Shares/ShareRedirectComponent';
import {AuthGuard} from '@src/Model/Auth/AuthGuard';
import {HelpEditorGuard} from '@src/Model/Help/HelpEditorGuard';
import {NotFoundComponent} from '@src/Components/Errors/NotFoundComponent';
import {LegacyUrlRedirectComponent} from '@src/Components/Legacy/LegacyUrlRedirectComponent';
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

	/**
	 * 'help' plus the article slug after it - one route, so moving between
	 * articles reuses the component. Help is about the tool rather than a game
	 * version, so it sits at the top level, outside any version.
	 */
	public static helpMatcher(segments: UrlSegment[]): UrlMatchResult | null
	{
		if (segments.length < 1 || segments.length > 2 || segments[0].path !== 'help') {
			return null;
		}
		return {consumed: segments, posParams: {}};
	}

	/**
	 * 'planner', 'planner/:planId' or 'planner/shared/:shareId' - one route,
	 * so switching plans (or entering a shared plan) only changes the params
	 * and reuses the component. Plan ids are UUIDs, so the literal 'shared'
	 * segment cannot collide with one.
	 */
	public static plannerMatcher(segments: UrlSegment[]): UrlMatchResult | null
	{
		if (segments.length < 1 || segments.length > 3 || segments[0].path !== 'planner') {
			return null;
		}
		if (segments.length === 3) {
			if (segments[1].path !== 'shared') {
				return null;
			}
			return {consumed: segments, posParams: {shareId: segments[2]}};
		}
		const posParams: Record<string, UrlSegment> = {};
		if (segments.length === 2) {
			posParams['planId'] = segments[1];
		}
		return {consumed: segments, posParams};
	}

	/**
	 * The old Satisfactory Tools' addresses: `/{0.8|1.0|1.0-ficsmas}/…`,
	 * version-less `/production` and `/codex/…`, and the `/import` link its
	 * "take my plans" button sends people to. All of them, whatever follows.
	 */
	public static legacyMatcher(segments: UrlSegment[]): UrlMatchResult | null
	{
		if (segments.length < 1 || !RouteList.LEGACY_FIRST_SEGMENTS.includes(segments[0].path)) {
			return null;
		}
		return {consumed: segments, posParams: {}};
	}

	private static readonly LEGACY_FIRST_SEGMENTS: ReadonlyArray<string> = ['0.8', '1.0', '1.0-ficsmas', 'production', 'codex', 'import'];

	/**
	 * Route `title`s and `data.description`s are the tab title and link
	 * preview text (AppTitleStrategy; "{V}" = the game version's name). Bots
	 * get the same strings from the API (tools-api: MetaResolver, which also
	 * mirrors the reserved first segments here) - keep them in sync. A route
	 * without a title shows the site defaults.
	 */
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
					// Global settings - not scoped to a game version. The open
					// section is part of the URL; a bare /settings redirects to
					// the first one (links made before that still work).
					path: 'settings',
					title: 'Settings',
					component: SettingsComponent,
				},
				{
					path: 'settings/:section',
					title: 'Settings',
					component: SettingsComponent,
				},
				{
					path: 'about',
					title: 'About',
					data: {description: 'Who makes Satisfactory Tools, what it can do, and where to report a bug or ask for a feature.'},
					component: AboutComponent,
				},
				{
					// Open to anonymous users too - their created versions are
					// tracked in localStorage instead of the account.
					path: 'create-version',
					title: 'Create custom version',
					data: {description: 'Make your own game version: add mods, change recipe and power costs, and set up a different world.'},
					component: CreateVersionPageComponent,
				},
				// Mod management - signed-in users only. All of these must
				// precede the ':versionSlug' catch-all.
				{
					path: 'mods',
					title: 'Mods',
					data: {description: 'Upload and manage mod data, then use the mods in your custom game versions.'},
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
					title: 'Mod editor',
					data: {description: 'Write the items, recipes and buildings of a mod and get the data file to upload.'},
					component: ModEditorComponent,
				},
				{
					// Writing the tutorials - editors only. Must precede the
					// help matcher, which would otherwise read 'editor' as a slug.
					path: 'help/editor',
					title: 'Help editor',
					canActivate: [HelpEditorGuard],
					children: [
						{
							path: '',
							component: HelpEditorComponent,
						},
						{
							// ':id' is an article uuid, or 'new'.
							path: ':id',
							component: HelpArticleEditorComponent,
						},
					],
				},
				{
					// Tutorials. Must precede the ':versionSlug' catch-all.
					matcher: RouteList.helpMatcher,
					title: 'Help',
					data: {description: 'Guides and reference for Satisfactory Tools.'},
					component: HelpPageComponent,
				},
				{
					path: 'auth',
					children: [
						{
							path: 'login',
							title: 'Sign in',
							component: LoginComponent,
						},
						{
							path: 'register',
							title: 'Register',
							component: RegisterComponent,
						},
						{
							path: 'forgot-password',
							title: 'Forgot password',
							component: ForgotPasswordComponent,
						},
						{
							path: 'reset-password',
							title: 'Reset password',
							component: ResetPasswordComponent,
						},
						{
							// OAuth providers redirect here; the page forwards
							// the query string to the backend callback.
							path: 'callback/:provider',
							title: 'Sign in',
							component: OAuthCallbackComponent,
						},
					],
				},
				{
					// Sign-in methods management (connected accounts).
					path: 'account',
					title: 'Account',
					canActivate: [AuthGuard],
					component: AccountComponent,
				},
				{
					// Public share links - no auth, must precede the
					// ':versionSlug' catch-all. Redirects into the planner
					// of the share's version, where the share opens read-only.
					path: 'shared/:shareId',
					component: ShareRedirectComponent,
				},
				{
					// Links from the old Satisfactory Tools era. Must precede
					// the ':versionSlug' catch-all, which would send them home.
					matcher: RouteList.legacyMatcher,
					component: LegacyUrlRedirectComponent,
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
							title: 'Codex ({V})',
							data: {description: 'Searchable codex of items, recipes, buildings and schematics in Satisfactory ({V}).'},
							component: CodexPageComponent,
						},
						{
							// 'planner' with an optional ':planId' - one route, so switching
							// plans only changes the param and reuses the component.
							matcher: RouteList.plannerMatcher,
							title: 'Planner ({V})',
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
