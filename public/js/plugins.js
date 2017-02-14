// Avoid `console` errors in browsers that lack a console.
(function() {
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeline', 'timelineEnd', 'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());

// Place any jQuery/helper plugins in here.

function ready (fn) {
	if (document.readyState != 'loading'){
		fn();
	} else {
		document.addEventListener('DOMContentLoaded', fn);
	}
}

/* fetch sugar methods */
(function () {
	window.postJson = postJson;
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
}());
