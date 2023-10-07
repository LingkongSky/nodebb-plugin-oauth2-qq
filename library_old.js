'use strict';
(function (module) {

const nconf = require.main.require('nconf');
const winston = require.main.require('winston');
const meta = require.main.require('./src/meta');
const controllers = require('./lib/controllers');
const routeHelpers = require.main.require('./src/routes/helpers');


var User = require.main.require('./src/user');
var db = require.main.require('./src/database');
var async = require.main.require('async');
var passport = require.main.require('passport');
var authenticationController = require.main.require('./src/controllers/authentication');


const QQ = {};


	QQ.addMenuItem = function (custom_header, callback) {
	custom_header.authentication.push({
		route: "/plugins/oauth2-qq",
		icon: 'fa-tint',
		name: 'OAuth2 QQ',
	});

	callback(null, custom_header);
};




	QQ.init = async (params) => {

		const hostHelpers = require.main.require('./src/routes/helpers');

		hostHelpers.setupAdminPageRoute(data.router, '/admin/plugins/oauth2-qq', (req, res) => {
			res.render('admin/plugins/oauth2-qq', {
				title: "QQ",
				baseUrl: nconf.get('url'),
			});
		});

		hostHelpers.setupPageRoute(data.router, '/deauth/qq', [data.middleware.requireUser], (req, res) => {
			res.render('plugins/oauth2-qq/deauth', {
				service: 'QQ',
			});
		});
		data.router.post('/deauth/qq', [data.middleware.requireUser, data.middleware.applyCSRF], (req, res, next) => {

			QQ.deleteUserData({
				uid: req.user.uid,
			}, (err) => {
				if (err) {
					return next(err);
				}

				res.redirect(`${nconf.get('relative_path')}/me/edit`);
			});

		});

		meta.settings.get('oauth2-qq', (_, loadedSettings) => {


			if (loadedSettings.id) {
				QQ.settings.id = loadedSettings.id;
			}

		});



	};





	QQ.load = async function (params) {
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




	module.exports = QQ;

}(module));
