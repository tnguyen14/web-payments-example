var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
require('dotenv-safe').load();

app.use(bodyParser.json());
app.post('/merchant-validate', function (req, res) {
	if (!req.body.validationURL) {
		return res.status(400).send('Missing validation URL.');
	}
	request.post(req.body.validationURL, {
		merchantId: process.env.MERCHANT_ID,
		merchantName: process.env.MERCHANT_NAME,
		merchantDomain: process.env.MERCHANT_DOMAIN
	}, function (err, resp, body) {
		if (err) {
			console.error(err);
			return;
		}
		console.log(resp);
		console.log(body);
	});
});

app.use(express.static('public'));

app.listen(process.env.PORT || 3000, function () {
	console.log('Express is listening.');
});
