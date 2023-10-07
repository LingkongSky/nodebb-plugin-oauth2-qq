define('admin/plugins/oauth2-qq', ['settings', 'alerts'], function (Settings, alerts) {
	'use strict';

	var ACP = {};

	ACP.init = function () {

	Settings.load('oauth2-qq', $('.oauth2-qq-settings'));

		$('#save').on('click', function () {
		Settings.save('oauth2-qq', $('.oauth2-qq-settings'), function () {
			alerts.alert({
				type: 'success',
				alert_id: 'oauth2-qq-saved',
				title: 'Settings Saved',
				message: 'Please rebuild and restart your NodeBB to apply these settings, or click on this alert to do so.',
				clickfn: function () {
					socket.emit('admin.reload');
				},
			});
		});



	});
};
	return ACP;
});
