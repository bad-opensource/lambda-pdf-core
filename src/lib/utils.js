const atob = require('atob');

const pipe = (...functions) => input => functions.reduce(async (composition, nextFunction) => nextFunction(await composition), input);

function b64DecodeUnicode(str) {
	return decodeURIComponent(atob(str).split('').map(c => {
		return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
	}).join(''));
}

const parseEventData = (event, mocks) => {
	let data = {};

	try {
		data = mocks[event.pathParameters.mock];
	}
	catch (e) {
		if (typeof event.body === 'string') {
			try {
				if (event.isBase64Encoded) {
					const decoded = b64DecodeUnicode(event.body);
					data = JSON.parse(decoded);
				}
				else {
					data = JSON.parse(event.body) || null;
				}
			}
			catch (e) {
				console.log(e);
				data = null;
			}
		}
		else {
			data = event.body || null;
		}
	}
	return {data};
};

const showError = (message = '') => {
	return {
		statusCode: 500,
		body: message
	};
};

module.exports = {pipe, parseEventData, showError};