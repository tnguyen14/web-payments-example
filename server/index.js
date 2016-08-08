require('dotenv-safe').load();
var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();
var debug = require('debug')('apple-pay');
var fs = require('fs');
var path = require('path');
var certFilePath = path.resolve(__dirname, './resources/applepaytls.pem');
var keyFilePath = path.resolve(__dirname, './resources/applepaytls.key');

var authorizedOrigins = process.env.AUTHORIZED_ORIGINS.split(',');
app.use(cors({
	origin: function (origin, callback) {
		callback(null, authorizedOrigins.indexOf(origin) !== -1);
	}
}));

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
		res.json({
			merchantIdentifier: body.merchantIdentifier,
			merchantSessionIdentifier: body.merchantSessionIdentifier,
			nonce: body.nonce,
			domainName: process.env.MERCHANT_DOMAIN,
			epochTimestamp: body.epochTimestamp,
			signature: body.signature,
			displayName: body.displayName
		});
	});
});

app.post('/merchant-register', function (req, res) {
	if (!req.body.domainNames || !req.body.partnerMerchantName || !req.body.encryptTo || !req.body.partnerInternalMerchantIdentifier) {
		return res.status(400).send('Missing registration parameters');
	}
	request.post({
		url: process.env.MERCHANT_REGISTER_URL,
		json: true,
		body: {
			domainNames: [process.env.MERCHANT_DOMAIN],
			partnerMerchantName: process.env.MERCHANT_NAME,
			partnerInternalMerchantIdentifier: process.env.MERCHANT_ID,
			encryptTo: process.env.MERCHANT_ID
		},
		cert: fs.readFileSync(certFilePath),
		key: fs.readFileSync(keyFilePath)
	}, function (err, resp, body) {
		if (err) {
			console.error(err);
			return;
		}
		res.json({
			status: 'OK'
		});
	});
});

app.use(express.static('public'));

app.listen(process.env.PORT || 3000, function () {
	debug('Express is listening.');
});
