export const env = {
	production: true,
	webUrl: 'https://new.satisfactorytools.com',
	apiUrl: 'https://api.new.satisfactorytools.com',
	desktopAppPublic: false,
	// siteId null = nothing is sent; fill in the new tools' Matomo site id once it exists (the old tools are site 4).
	matomo: {
		url: 'https://analytics.greeny.dev/',
		siteId: null as number | null,
		// The "Platform" visit-scope dimension created in Matomo for this site; null sends no platform.
		platformDimensionId: null as number | null,
	},
};
