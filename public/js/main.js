/* global jQuery, fetch, ApplePaySession */
if (window.ApplePaySession) {
	var STATUSES = {
		Failure: ApplePaySession.STATUS_FAILURE,
		InvalidBillingPostalAddress: ApplePaySession.STATUS_INVALID_BILLING_POSTAL_ADDRESS,
		InvalidShippingPostalAddress: ApplePaySession.STATUS_INVALID_SHIPPING_POSTAL_ADDRESS,
		InvalidShippingContact: ApplePaySession.STATUS_INVALID_SHIPPING_CONTACT,
		PINRequired: ApplePaySession.STATUS_PIN_REQUIRED,
		PINIncorrect: ApplePaySession.STATUS_PIN_INCORRECT,
		PINLockout: ApplePaySession.STATUS_PIN_LOCKOUT
	};
}

var currencyCode = 'USD';

var shippingMethods = [{
	label: 'Priority Shipping',
	detail: 'USPS Priority Shipping',
	amount: '5.99',
	identifier: 'usps-priority'
}, {
	label: '2 Day Shipping',
	detail: '2 Day Shipping - arrives on ' + new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toLocaleDateString(),
	amount: '8.99',
	identifier: '2-day'
}];

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

function getProductDetails (productNode) {
	return {
		label: productNode.querySelector('h3').innerHTML,
		amount: productNode.querySelector('.price').innerHTML
			.replace('$', '')
	}
}

function createApplePayRequest (product) {
	return {
		countryCode: 'US',
		currencyCode: currencyCode,
		supportedNetworks: ['amex', 'visa', 'masterCard', 'discover'],
		merchantCapabilities: ['supports3DS'],
		requiredShippingContactFields: ['postalAddress', 'name', 'email', 'phone'],
		requiredBillingContactFields: ['postalAddress', 'name'],
		lineItems: [product],
		total: {
			label: 'Apple Pay Web Example',
			amount: product.amount
		}
	};
}

function createPaymentRequest (product) {
	var methodData = [{
		supportedMethods: ['visa', 'mastercard', 'amex']
	}, {
		supportedMethods: ['https://android.com/pay'],
		data: {
			environment: 'TEST',
			paymentMethodTokenizationParameters: {
				tokenizationType: 'NETWORK_TOKEN',
				parameters: {
					publicKey: 'BO39Rh43UGXMQy5PAWWe7UGWd2a9YRjNLPEEVe+zWIbdIgALcDcnYCuHbmrrzl7h8FZjl6RCzoi5/cDrqXNRVSo='
				}
			}
		}
	}];
	var details = {
		total: {
			label: 'Total',
			amount: {
				currency: currencyCode,
				value: product.amount
			}
		},
		displayItems: [{
			label: product.label,
			amount: {
				currency: currencyCode,
				value: product.amount
			}
		}]
	};
	 var options = {
		 requestShipping: true,
		 requestPayerEmail: true,
		 requestPayerPhone: true
	};
	return {
		methodData: methodData,
		details: details,
		options: options
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

function calculateTotalWithShipping (request, shippingMethod) {
	var lineItems = request.lineItems.concat({
		label: shippingMethod.label,
		amount: shippingMethod.amount
	});
	var totalAmount = lineItems.reduce(function (total, item) {
		return total += parseFloat(item.amount);
	}, 0);
	var total = Object.assign({}, request.total, {
		amount: totalAmount.toString()
	});
	return {
		lineItems: lineItems,
		total: total
	};
}

function shippingContactSelected (session, request, event) {
	console.log(event.shippingContact);
	var updatedRequest = calculateTotalWithShipping(request, shippingMethods[0]);
	session.completeShippingContactSelection(ApplePaySession.STATUS_SUCCESS, shippingMethods, updatedRequest.total, updatedRequest.lineItems);
}

function paymentAuthorized (session, request, event) {
	console.log(event);
	postJson('payment-authorize', {
		payment: event.payment,
		amount: request.total.amount
	}).then(function (response) {
		console.log(response);
		session.completePayment(ApplePaySession.STATUS_SUCCESS);
		window.location = 'order-confirmation.html';
	});
}

function paymentMethodSelected (session, request, event) {
	console.log(event.paymentMethod);
	session.completePaymentMethodSelection(request.total, request.lineItems);
}

function shippingMethodSelected (session, request, event) {
	console.log(event.shippingMethod);
	var updatedRequest = calculateTotalWithShipping(request, event.shippingMethod);
	session.completeShippingMethodSelection(ApplePaySession.STATUS_SUCCESS, updatedRequest.total, updatedRequest.lineItems);
}

function cancel (session, event) {
	console.log(event);
}

function shippingAddressChange (request, details, event) {
	console.log(request.shippingAddress);
	event.updateWith(Promise.resolve(Object.assign({}, details, {
		shippingOptions: shippingMethods.map(function (method) {
			return {
				id: method.identifier,
				label: method.label,
				amount: {
					currency: currencyCode,
					value: method.amount
				}
			};
		})
	})));
}

function shippingOptionChange (request, details, event) {
	console.log(request.shippingOption);
	var selectedShippingOption = shippingMethods.find(function (method) {
		return method.identifier === request.shippingOption;
	});
	event.updateWith(Promise.resolve(Object.assign({}, details, {
		total: {
			label: 'Total',
			amount: {
				currency: currencyCode,
				value: Number(details.total.amount.value) + Number(selectedShippingOption.amount)
			}
		},
		shippingOptions: shippingMethods.map(function (method) {
			return {
				id: method.identifier,
				label: method.label,
				amount: {
					currency: currencyCode,
					value: method.amount
				},
				selected: (method.identifier === request.shippingOption)
			};
		})
	})))
}

jQuery(document).ready(function ($) {
	var applePayButtons = document.querySelectorAll('.apple-pay');
	Array.prototype.forEach.call(applePayButtons, function (button) {
		button.addEventListener('click', function (e) {
			if (!window.ApplePaySession) {
				return;
			}
			e.preventDefault();
			var request = createApplePayRequest(getProductDetails(e.target.parentNode.parentNode));
			var session = new ApplePaySession(1, request);
			session.onvalidatemerchant = validateMerchant.bind(window, session);
			session.onpaymentauthorized = paymentAuthorized.bind(window, session, request);
			session.onshippingcontactselected = shippingContactSelected.bind(window, session, request);
			session.onpaymentmethodselected = paymentMethodSelected.bind(window, session, request);
			session.onshippingmethodselected = shippingMethodSelected.bind(window, session, request);
			session.oncancel = cancel.bind(window, session);
			session.begin();
		});
	});
	var buyNowButtons = document.querySelectorAll('.buy-now');
	Array.prototype.forEach.call(buyNowButtons, function (button) {
		button.addEventListener('click', function (e) {
			e.preventDefault();
			if (!window.PaymentRequest) {
				return;
			}
			var requestData = createPaymentRequest(getProductDetails(e.target.parentNode.parentNode));
			var request = new PaymentRequest(requestData.methodData, requestData.details, requestData.options);
			request.addEventListener('shippingaddresschange', shippingAddressChange.bind(window, request, requestData.details));
			request.addEventListener('shippingoptionchange', shippingOptionChange.bind(window, request, requestData.details));
			request.show()
				.then(function (instrument) {
					console.log(instrument);
					instrument.complete();
				});
		});
	})
});
