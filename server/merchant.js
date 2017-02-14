var debug = require('debug')('apple-pay');
var request = require('request');
var fs = require('fs');
var path = require('path');
var certFilePath = path.resolve(__dirname, './resources/applepaytls.pem');
var keyFilePath = path.resolve(__dirname, './resources/applepaytls.key');

exports.validate = validate;

function validate (req, res) {
	if (!req.body.validationURL) {
		return res.status(400).send('Missing validation URL.');
	}
	request.post({
		url: req.body.validationURL,
		json: true,
		body: {
			merchantIdentifier: process.env.MERCHANT_ID,
			displayName: process.env.MERCHANT_NAME,
			domainName: process.env.MERCHANT_DOMAIN
		},
		cert: fs.readFileSync(certFilePath),
		key: fs.readFileSync(keyFilePath)
	}, function (err, resp, body) {
		if (err) {
			debug(err);
			res.sendStatus(500);
			return;
		}
		if (body.statusCode === '400' || body.statusCode === '500') {
			debug(body);
			res.status(400).json(body);
			return;
		}
		debug('Session validation received.');
		res.json(body);
	});
}
