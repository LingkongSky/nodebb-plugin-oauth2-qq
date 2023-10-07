'use strict';

/*
	This file is located in the "modules" block of plugin.json
	It is only loaded when the user navigates to /admin/plugins/oauth2-qq page
	It is not bundled into the min file that is served on the first load of the page.
*/

import { save, load } from 'settings';

export function init() {
	handleSettingsForm();
	//setupUploader();
};

function handleSettingsForm() {
	load('oauth2-qq', $('.oauth2-qq-settings'), function () {
		//setupColorInputs();
	});

	$('#save').on('click', () => {
		save('oauth2-qq', $('.oauth2-qq-settings')); // pass in a function in the 3rd parameter to override the default success/failure handler
	});
}
