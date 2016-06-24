/* global jQuery, fetch, ApplePaySession */
var STATUSES = {
	'Failure': ApplePaySession.STATUS_FAILURE,
	'InvalidBillingPostalAddress': ApplePaySession.STATUS_INVALID_BILLING_POSTAL_ADDRESS,
	'InvalidShippingPostalAddress': ApplePaySession.STATUS_INVALID_SHIPPING_POSTAL_ADDRESS,
	'InvalidShippingContact': ApplePaySession.STATUS_INVALID_SHIPPING_CONTACT,
	'PINRequired': ApplePaySession.STATUS_PIN_REQUIRED,
	'PINIncorrect': ApplePaySession.STATUS_PIN_INCORRECT,
	'PINLockout': ApplePaySession.STATUS_PIN_LOCKOUT
};

function mapStatus (status) {
	if (status && STATUSES[status]) {
		return STATUSES[status];
	}
	return ApplePaySession.STATUS_FAILURE;
}

function handleResponse (response) {
	return response.json()
		.then(function (json) {
			if (response.status >= 200 && response.status < 300) {
				// Return success JSON response
				return json;
			}

			// Throw error with response status
			throw new Error(mapStatus(json ? json.status : null));
		});
}

function postJson (url, data) {
	var json = data;
	if (typeof data === 'object') {
		json = JSON.stringify(data);
	} else if (typeof data !== 'string') {
		throw new Error('Data must be an object or a JSON string.');
	}
	return fetch(url, {
		method: 'POST',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		},
		body: json
	}).then(handleResponse);
}

// function getJson (url) {
// 	return fetch(url, {
// 		credentials: 'include',
// 		headers: {
// 			'Accept': 'application/json'
// 		}
// 	}).then(handleResponse);
// }

function createRequest (productNode) {
	return {
		countryCode: 'US',
		currencyCode: 'USD',
		supportedNetworks: ['amex', 'visa', 'masterCard', 'discover'],
		merchantCapabilities: ['supports3DS'],
		requiredShippingAddressFields: ['postalAddress'],
		total: {
			label: productNode.querySelector('h3').innerHTML,
			amount: productNode.querySelector('.price').innerHTML
				.replace('$', '')
		}
	};
}

function merchantValidation (session, event) {
	postJson('/merchant-validate', event)
		.then(function (response) {
			console.log(JSON.stringify(response));
			session.completeMerchantValidation(response.session);
		}, function (status) {
			console.log(JSON.stringify(status));
			session.abort();
		});
}

jQuery(document).ready(function ($) {
	var applePayButtons = document.querySelectorAll('.apple-pay');
	Array.prototype.forEach.call(applePayButtons, function (button) {
		button.addEventListener('click', function (e) {
			e.preventDefault();
			var request = createRequest(e.target.parentNode);
			var session = new ApplePaySession(1, request);
			session.begin();
			session.onvalidatemerchant = merchantValidation.bind(window, session);
		});
	});
});
