const { BrowserWindow, app } = require('electron').remote;
const remote = require('electron').remote;
const { Menu, TouchBar } = remote;
const fs = require('fs');
const css = fs.readFileSync(__dirname + '/assets/fb.css', 'utf-8');
const env = require('./config/env.js');
const constants = require('./helpers/constants');
const FocusHandler = require('./modules/focusHandler');
const MainMenu = require('./modules/mainMenu');
const getURL = require('./helpers/getURL');
let loginWindow;

onload = () => {
	document.getElementById('logo').setAttribute('src', `./assets/${env.product}.png`);
	const webview = document.getElementById('webview');
	const setup = document.getElementById('setup');
	
	const mainMenu = new MainMenu(app, webview, setup);
	Menu.setApplicationMenu(Menu.buildFromTemplate(mainMenu));

	if (env.product === constants.PRODUCT_WWW) {
		document.getElementById('webview').setAttribute('src', getURL());
	}

	webview.addEventListener('did-stop-loading', () => {
		if (webview.getURL().startsWith(getURL())) {
			webview.className = '';
		}
	});

	webview.addEventListener('dom-ready', () => {
		webview.insertCSS(css);
		if (env.name === 'development') {
			webview.openDevTools();
		}
	});

	webview.addEventListener('ipc-message', e => {
		if (e.channel === constants.DOCK_COUNT) {
			app.setBadgeCount(e.args[0]);
		} else if (e.channel === constants.TOUCH_BAR) {
			try {
				const data = JSON.parse(e.args[0]);
				remote.getCurrentWindow().setTouchBar(
					new TouchBar(
						data.map(
							({ name, active, unread, id }) => new TouchBar.TouchBarButton({
								label: unread ? `💬 ${name}` : name,
								backgroundColor: active ? '#0084FF' : undefined,
								click: () => {
									webview.send(constants.JUMP_TO_CONVERATION, id);
								},
							})
						)
					)
				);
			} catch (e) {
				//
			}
		}
	});

	webview.addEventListener('did-get-redirect-request', ({ oldURL, newURL }) => {
		if (oldURL.startsWith(getURL()) && newURL.indexOf('/login') > -1) {
			loginWindow = new BrowserWindow({
				parent: remote.getCurrentWindow(),
				show: false,
				minimizable: false,
				maximizable: false,
				webPreferences: {
					nodeIntegration: false,
				},
			});
			loginWindow.loadURL(oldURL);
			loginWindow.once('ready-to-show', () => {
				loginWindow.show();
			});
			loginWindow.webContents.on('will-navigate', (e, url) => {
				if (url.startsWith(getURL())) {
					loginWindow.close();
					webview.loadURL(getURL());
				}
			});
		} else if (newURL.startsWith(getURL()) && loginWindow) {
			loginWindow.close();
		}
	});

	// Ensure focus propagates when the application is focused
	const webviewFocusHandler = new FocusHandler(webview);
	app.on('browser-window-focus', webviewFocusHandler);
};
