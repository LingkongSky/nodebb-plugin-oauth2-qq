'use strict';

const nconf = require.main.require('nconf');
const winston = require.main.require('winston');

const meta = require.main.require('./src/meta');

const controllers = require('./lib/controllers');

const routeHelpers = require.main.require('./src/routes/helpers');



const plugin = {};






plugin.init = async (params) => {


	const { router /* , middleware , controllers */ } = params;

	// Settings saved in the plugin settings can be retrieved via settings methods
	const { setting1, setting2 } = await meta.settings.get('oauth2-qq');
	if (setting1) {
		console.log(setting2);
	}

	routeHelpers.setupPageRoute(router, '/oauth2-qq', [(req, res, next) => {
		winston.info(`[plugins/oauth2-qq] In middleware. This argument can be either a single middleware or an array of middlewares`);
		setImmediate(next);
	}], (req, res) => {
		winston.info(`[plugins/oauth2-qq] Navigated to ${nconf.get('relative_path')}/oauth2-qq`);
		res.render('oauth2-qq', { uid: req.uid });
	});

	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/oauth2-qq', controllers.renderAdminPage);



};






plugin.load = async function (params) {
	const settings = await meta.settings.get('oauth2-qq');
	if (!settings) {
		winston.warn(`[plugins/${pluginData.nbbId}] Settings not set or could not be retrieved!`);
		return;
	}

	
	pluginSettings = settings;
/*
	const routeHelpers = require.main.require('./src/routes/helpers');
	routeHelpers.setupAdminPageRoute(params.router, `/admin/plugins/${pluginData.nbbId}`, renderAdmin);

	*/
};





plugin.addRoutes = async ({ router, middleware, helpers }) => {
	const middlewares = [
		middleware.ensureLoggedIn,			// use this if you want only registered users to call this route
		// middleware.admin.checkPrivileges,	// use this to restrict the route to administrators
	];

	routeHelpers.setupApiRoute(router, 'get', '/oauth2-qq/:param1', middlewares, (req, res) => {
		helpers.formatApiResponse(200, res, {
			foobar: req.params.param1,
		});
	});
};

plugin.addAdminNavigation = (header) => {
	header.plugins.push({
		route: '/plugins/oauth2-qq',
		icon: 'fa-tint',
		name: 'OAuth2 QQ',
	});

	return header;
};

module.exports = plugin;
