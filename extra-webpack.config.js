const webpack = require('webpack');
const path = require('path');

module.exports = (config) => {
	// Silence the Sass @import deprecation from Bootstrap/Bootswatch SCSS files.
	// The webpack builder schema doesn't expose silenceDeprecations, so we patch
	// the sass-loader options directly on Angular's generated config.
	patchSassLoader(config.module?.rules ?? []);

	config.plugins.push(
		new webpack.NormalModuleReplacementPlugin(
			/^node:(fs|crypto|path|os|stream|util|events|assert|buffer)$/,
			path.resolve(__dirname, 'node-browser-stub.js'),
		),
		// elkjs/lib/main.js optionally requires 'web-worker' for Node.js worker threads.
		// In the browser we never pass workerUrl, so this code path is dead - stub it out.
		new webpack.NormalModuleReplacementPlugin(
			/^web-worker$/,
			path.resolve(__dirname, 'node-browser-stub.js'),
		),
	);

	return config;
};

function patchSassLoader(rules) {
	for (const rule of rules) {
		if (rule.rules) patchSassLoader(rule.rules);
		if (rule.oneOf) patchSassLoader(rule.oneOf);

		const uses = Array.isArray(rule.use) ? rule.use : rule.use ? [rule.use] : [];
		for (const use of uses) {
			if (typeof use === 'object' && use?.loader?.includes('sass-loader')) {
				use.options ??= {};
				use.options.sassOptions ??= {};
				use.options.sassOptions.silenceDeprecations ??= [];
				use.options.sassOptions.silenceDeprecations.push('import');
			}
		}
	}
}
