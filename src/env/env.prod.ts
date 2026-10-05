export const env = {
	production: true,
	apiUrl: 'https://api.new.satisfactorytools.com',
	// Matomo (same instance as the old tools, which is site 4). Page views and
	// the migration funnel events are only sent while siteId is set - fill in
	// the site id of the new tools once it exists in Matomo.
	matomo: {url: 'https://analytics.greeny.dev/', siteId: null as number | null},
	// Where beta users' browser data (local plans, settings, sign-in) is
	// fetched from after the move to the apex domain; see docs/migration-phase-2.md.
	// A no-op while the app is served from this origin itself.
	handoffSourceOrigin: 'https://new.satisfactorytools.com' as string | null,
};
