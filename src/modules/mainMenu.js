// This module handles the main OS-level menu integration
const remote = require('electron').remote;
const defaultMenu = require('electron-default-menu');
const { autoUpdater, dialog } = remote;
const env = require('../config/env.js');
const userConfig = require('./userConfig');
const constants = require('../helpers/constants');
const getURL = require('../helpers/getURL');

module.exports = function MainMenu(app, webview, setup) {
	const menu = defaultMenu(app);
	const domain = userConfig.get('domain');

	menu.splice(menu.findIndex(item => item.label === 'Edit'), 0, {
		label: 'File',
		submenu: [
			{
				label: 'New Conversation',
				accelerator: 'CmdOrCtrl+N',
				click() {
					webview.send(constants.NEW_CONVERSATION);
				},
			},
		],
	});

	menu[0].submenu.splice(
		1,
		0,
		{
			type: 'separator',
		},
		{
			label: 'Preferences...',
			accelerator: 'CmdOrCtrl+,',
			click() {
				webview.send(constants.SHOW_SETTINGS);
			},
		}
	);

	let windowMenu = menu[menu.findIndex(item => item.label === 'Window')];
	windowMenu.submenu.push(
		{
			label: 'Select Next Conversation',
			accelerator: 'CmdOrCtrl+]',
			click() {
				webview.send(constants.NEXT_CONVERSATION);
			},
		},
		{
			label: 'Select Previous Conversation',
			accelerator: 'CmdOrCtrl+[',
			click() {
				webview.send(constants.PREV_CONVERSATION);
			},
		},
		{
			type: 'separator',
		}
	);

	if (env.product === constants.PRODUCT_WORKPLACE) {
		windowMenu.submenu.push({
			label: 'Show notifications in menu bar',
			type: 'checkbox',
			checked: userConfig.get('menubar'),
			click() {
				userConfig.set('menubar', !userConfig.get('menubar'));
				remote.app.relaunch();
				remote.app.exit(0);
			},
		});
	}

	if (domain || env.product === constants.PRODUCT_WWW) {
		menu[1].submenu.push(
			{
				type: 'separator',
			},
			{
				label: env.product === constants.PRODUCT_WWW ? 'Logout' : `Logout from “${domain}”`,
				click() {
					const c = webview.getWebContents().session.cookies;
					c.get({}, (error, cookies) => {
						for (var i = cookies.length - 1; i >= 0; i--) {
							const { name, domain, path, secure } = cookies[i];
							const url = 'http' + (secure ? 's' : '') + '://' + domain + path;
							c.remove(url, name, () => {});
						}
					});

					// this waits for all cookies to be removed, it would be nicer to wait for all callbacks to be called
					setTimeout(
						() => {
							if (env.product === constants.PRODUCT_WORKPLACE) {
								userConfig.delete('domain');
							}
							app.relaunch();
							app.exit(0);
						},
						500
					);
				},
			}
		);
		document.getElementById('webview').setAttribute('src', getURL());
	} else {
		setup.className = 'active';
		setup.onsubmit = () => {
			let domain = setup.querySelector('input').value.trim();
			userConfig.set('domain', domain);
			document.getElementById('webview').setAttribute('src', getURL());
		};
	}

	if (env.name === 'production') {
		menu[0].submenu.splice(1, 0, {
			label: 'Check for Update',
			click() {
				autoUpdater.on('update-not-available', () => {
					autoUpdater.removeAllListeners('update-not-available');
					dialog.showMessageBox({
						message: 'No update available',
						detail: `${env.appName} ${app.getVersion()} is the latest version available.`,
						buttons: [ 'OK' ],
					});
				});
				autoUpdater.checkForUpdates();
			},
		});
	}

	return menu;
};
