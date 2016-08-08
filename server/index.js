require('dotenv-safe').load();
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();
var debug = require('debug')('apple-pay');
var merchant = require('./merchant');

var authorizedOrigins = process.env.AUTHORIZED_ORIGINS.split(',');
app.use(cors({
	origin: function (origin, callback) {
		callback(null, authorizedOrigins.indexOf(origin) !== -1);
	}
}));

app.use(bodyParser.json());
app.post('/merchant-validate', merchant.validate);
app.post('/merchant-register', merchant.register);

app.use(express.static('public'));

app.listen(process.env.PORT || 3000, function () {
	debug('Express is listening.');
});
