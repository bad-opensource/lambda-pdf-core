const pipe = (...functions) => input => functions.reduce(async (composition, nextFunction) => nextFunction(await composition), input);

const parseEventData = event => {
	const atob = require('atob');
	let data = {};

	try {
		data = mocks[event.pathParameters.mock];
	}
	catch (e) {
		if (typeof event.body === 'string') {
			try {
				if (event.isBase64Encoded) {
					const decoded = atob(event.body);
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