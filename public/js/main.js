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
	var item = {
		label: productNode.querySelector('h3').innerHTML,
		amount: productNode.querySelector('.price').innerHTML
			.replace('$', '')
	};
	return {
		countryCode: 'US',
		currencyCode: 'USD',
		supportedNetworks: ['amex', 'visa', 'masterCard', 'discover'],
		merchantCapabilities: ['supports3DS'],
		requiredShippingContactFields: ['postalAddress', 'name'],
		// requiredBillingContactFields: ['postalAddress'],
		lineItems: [item],
		total: {
			label: 'Apple Pay Web Example',
			amount: item.amount
		}
	};
}

function validateMerchant (session, event) {
	postJson('merchant-validate', {
		validationURL: event.validationURL
	}).then(function (response) {
		console.log(JSON.stringify(response));
		session.completeMerchantValidation(response);
	}, function (status) {
		console.log(JSON.stringify(status));
		session.abort();
	});
}

function shippingContactSelected (session, request, event) {
	console.log(event.shippingContact);
	session.completeShippingContactSelection(ApplePaySession.STATUS_SUCCESS, [{
		label: 'Ground',
		detail: 'USPS Ground',
		amount: '5.99',
		identifier: 'usps-ground'
	}], request.total, request.lineItems);
}

function paymentAuthorized (session, event) {
	console.log(event);
	session.completePayment(ApplePaySession.STATUS_SUCCESS);
	window.location = 'order-confirmation.html';
}

function paymentMethodSelected (session, request, event) {
	console.log(event.paymentMethod);
	session.completePaymentMethodSelection(request.total, request.lineItems);
}

function shippingMethodSelected (session, request, event) {
	console.log(event.shippingMethod);
	session.completePayment(ApplePaySession.STATUS_SUCCESS, request.total, request.lineItems);
}

jQuery(document).ready(function ($) {
	var applePayButtons = document.querySelectorAll('.apple-pay');
	Array.prototype.forEach.call(applePayButtons, function (button) {
		button.addEventListener('click', function (e) {
			e.preventDefault();
			var request = createRequest(e.target.parentNode);
			var session = new ApplePaySession(1, request);
			session.onvalidatemerchant = validateMerchant.bind(window, session);
			session.onpaymentauthorized = paymentAuthorized.bind(window, session);
			session.onshippingcontactselected = shippingContactSelected.bind(window, session, request);
			session.onpaymentmethodselected = paymentMethodSelected.bind(window, session, request);
			session.onshippingmethodselected = shippingMethodSelected.bind(window, session, request);
			session.begin();
		});
	});
});
