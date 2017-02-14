/* global jQuery, fetch, ApplePaySession */

/* fetch sugar methods */
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

const currencyCode = 'USD';
const totalLabel = 'Total';

const shippingMethods = [{
	// label is only used for Apple Pay, not Payment Request
	label: 'Priority Shipping',
	// detail is used for Apple Pay
	// and Payment Request's shipping method's label
	detail: 'USPS Priority Shipping',
	amount: '5.99',
	identifier: 'usps-priority'
}, {
	label: '2 Day Shipping',
	detail: '2 Day Shipping - arrives on ' + new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toLocaleDateString(),
	amount: '8.99',
	identifier: '2-day'
}];

/* Apple Pay Web */
if (window.ApplePaySession) {
	const STATUSES = {
		Failure: ApplePaySession.STATUS_FAILURE,
		InvalidBillingPostalAddress: ApplePaySession.STATUS_INVALID_BILLING_POSTAL_ADDRESS,
		InvalidShippingPostalAddress: ApplePaySession.STATUS_INVALID_SHIPPING_POSTAL_ADDRESS,
		InvalidShippingContact: ApplePaySession.STATUS_INVALID_SHIPPING_CONTACT,
		PINRequired: ApplePaySession.STATUS_PIN_REQUIRED,
		PINIncorrect: ApplePaySession.STATUS_PIN_INCORRECT,
		PINLockout: ApplePaySession.STATUS_PIN_LOCKOUT
	};
}

function mapStatus (status) {
	if (status && STATUSES[status]) {
		return STATUSES[status];
	}
	return ApplePaySession.STATUS_FAILURE;
}

function getProductDetails (productNode) {
	return {
		label: productNode.querySelector('h3').innerHTML,
		amount: productNode.querySelector('.price').innerHTML
			.replace('$', '')
	}
}

function createApplePayPaymentRequest (product) {
	return {
		countryCode: 'US',
		currencyCode: currencyCode,
		supportedNetworks: ['amex', 'visa', 'masterCard', 'discover'],
		merchantCapabilities: ['supports3DS'],
		requiredShippingContactFields: ['postalAddress', 'name', 'phone'],
		requiredBillingContactFields: ['postalAddress', 'name'],
		lineItems: [product],
		total: {
			label: 'Apple Pay Web Example',
			amount: product.amount
		}
	};
}

function validateApplePayMerchant (session, event) {
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

function applePayPaymentMethodSelected (session, request, event) {
	console.log(event.paymentMethod);
	session.completePaymentMethodSelection(request.total, request.lineItems);
}

function selectApplePayShippingMethod (request, shippingMethod) {
	// add shipping method to line items
	var lineItems = request.lineItems.concat({
		label: shippingMethod.label,
		amount: shippingMethod.amount
	});

	// calculate total amount
	var totalAmount = lineItems.reduce(function (total, item) {
		return total += parseFloat(item.amount);
	}, 0);
	// create a new total object with the new amount from 
	// the request's original total
	var total = Object.assign({}, request.total, {
		amount: totalAmount.toString()
	});
	// return updated request
	return Object.assign({}, request, {lineItems, total});
}

function applePayShippingContactSelected (session, request, event) {
	console.log(event.shippingContact);
	var updatedRequest = selectApplePayShippingMethod(request,
		shippingMethods[0]);
	session.completeShippingContactSelection(ApplePaySession.STATUS_SUCCESS,
		shippingMethods, updatedRequest.total, updatedRequest.lineItems);

	// return the new request so the session's request can be updated
	return updatedRequest;
}

function applePayShippingMethodSelected (session, request, event) {
	console.log(event.shippingMethod);
	var updatedRequest = selectApplePayShippingMethod(request,
		event.shippingMethod);
	session.completeShippingMethodSelection(ApplePaySession.STATUS_SUCCESS,
		updatedRequest.total, updatedRequest.lineItems);

	// return the new request so the session's request can be updated
	return updatedRequest;
}

function applePayPaymentAuthorized (session, request, event) {
	console.log(event.payment);
	postJson('payment-authorize', {
		payment: event.payment,
		amount: request.total.amount
	}).then(function (response) {
		console.log(response);
		session.completePayment(ApplePaySession.STATUS_SUCCESS);
		window.location = 'order-confirmation.html';
	});
}

function cancel (session, event) {
	console.log(event);
}

function startApplePay () {
	// listen to apple pay buttons' click events
	var applePayButtons = document.querySelectorAll('.apple-pay');
	Array.prototype.forEach.call(applePayButtons, function (button) {
		button.addEventListener('click', function (e) {
			if (!window.ApplePaySession) {
				return;
			}
			e.preventDefault();
			var request = createApplePayPaymentRequest(getProductDetails(e.target.parentNode.parentNode));
			var session = new ApplePaySession(1, request);
			session.onvalidatemerchant = function (event) {
				validateApplePayMerchant(session, event);
			}
			session.onpaymentmethodselected = function (event) {
				applePayPaymentMethodSelected(session, request, event);
			}
			session.onshippingcontactselected = function (event) {
				request = applePayShippingContactSelected(session, request, event);
			}
			session.onshippingmethodselected = function (event) {
				request = applePayShippingMethodSelected(session, request, event);
			}
			session.onpaymentauthorized = function (event) {
				applePayPaymentAuthorized(session, request, event);
			}
			session.oncancel = function () {
				cancel(session);
			}
			session.begin();
		});
	});
}

/* Payment Request API */
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
			label: totalLabel,
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

function selectShippingOption (details, option) {
	var selectedShippingMethod;
	shippingMethods.forEach(function (method) {
		if (method.identifier === option) {
			selectedShippingMethod = method;
		}
	});
	return Object.assign({}, details, {
		shippingOptions: shippingMethods.map(function (method) {
			return {
				id: method.identifier,
				label: method.detail,
				amount: {
					currency: currencyCode,
					value: method.amount
				},
				selected: (method.identifier === option)
			}
		}),
		total: {
			label: totalLabel,
			amount: {
				currency: currencyCode,
				value: (parseFloat(details.total.amount.value) + parseFloat(selectedShippingMethod.amount)).toString()
			}
		}
	})
}

function shippingAddressChange (request, details, event) {
	console.log(request.shippingAddress);
	// select the first shipping method by default
	event.updateWith(Promise.resolve(selectShippingOption(details, shippingMethods[0].identifier)));
}

function shippingOptionChange (request, details, event) {
	console.log(request.shippingOption);
	event.updateWith(Promise.resolve(selectShippingOption(details, request.shippingOption)));
}

function startPaymentRequest () {
	// listen to buy now buttons' click events
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
					instrument.complete()
						.then(function () {
							window.location = 'order-confirmation.html';
						})
				}, function (failure) {
					console.error(failure);
				});
		});
	});
}

jQuery(document).ready(function ($) {
	startApplePay();
	startPaymentRequest();
});
