require('dotenv-safe').load();
var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var fs = require('fs');
var path = require('path');
var certFilePath = path.resolve(__dirname, './resources/applepaytls.pem');
var keyFilePath = path.resolve(__dirname, './resources/applepaytls.key');

app.use(bodyParser.json());
app.post('/merchant-validate', function (req, res) {
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
			console.error(err);
			return;
		}
		console.log('Session validation received.');
		res.json({
			merchantIdentifier: body.merchantIdentifier,
			merchantSessionIdentifier: body.merchantSessionIdentifier,
			nonce: body.nonce,
			domainName: process.env.MERCHANT_DOMAIN,
			epochTimestamp: body.epochTimestamp,
			signature: body.signature
		});
	});
});

app.use(express.static('public'));

app.listen(process.env.PORT || 3000, function () {
	console.log('Express is listening.');
});
