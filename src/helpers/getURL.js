const env = require('../config/env.js');
const constants = require('./constants');
const userConfig = require('../modules/userConfig');

const getURL = (domain = userConfig.get('domain')) => env.product === constants.PRODUCT_WWW
	? 'https://www.facebook.com/messages'
	: `https://${domain}.facebook.com/chat`;

module.exports = getURL;
