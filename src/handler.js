module.exports = ({
					  version,
					  templates = {},
					  helpers,
					  mocks,
					  schema,
					  patchData
				  }) => {
	const atob = require('atob');
	const {validate} = require('./lib/validate');
	const {getCompiledTemplate} = require('./lib/handlebars')({helpers, partials: templates.partials});
	const module = {};

	const parseData = (event) => {
		let data = {};

		try {
			data = mocks[event.pathParameters.mock];
		}
		catch (e) {
			if (typeof event.body === 'string') {
				try {
					if (event.isBase64Encoded) {
						console.log('Decode base64');
						data = JSON.parse(atob(event.body));
					}
					else {
						console.log('Got JSON string -> parse');
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

	const errorBody = (message = '') => {
		return {
			statusCode: 500,
			body: message
		};
	};

	module.check = async () => {
		const html = getCompiledTemplate(templates.check, {version});

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'text/html'
			},
			body: html
		};
	};

	module.html = async event => {
		const parsedData = parseData(event);
		if (!parsedData) {
			return errorBody('No parsedData');
		}

		const {valid, errors} = validate({schema, data: parsedData.data});
		if (valid !== true) {
			return errorBody(JSON.stringify(errors));
		}

		const patchedData = patchData ? patchData(parsedData) : parsedData;
		const html = getCompiledTemplate(templates.main, patchedData);

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'text/html'
			},
			body: html
		};
	};

	module.pdf = async event => {
		const pdf = require('./lib/pdf');

		const parsedData = parseData(event);
		if (!parsedData) {
			return errorBody('No Data for parsedData');
		}

		const {valid, errors} = validate({schema, data: parsedData.data});
		if (valid !== true) {
			return errorBody(JSON.stringify(errors));
		}

		const patchedData = patchData ? patchData(parsedData) : parsedData;

		const mainTemplate = getCompiledTemplate(templates.main, patchedData);
		const footerTemplate = getCompiledTemplate(templates.footer, patchedData);
		const headerTemplate = getCompiledTemplate(templates.header, patchedData);

		const generatedPdfData = await pdf.getPdf(mainTemplate, headerTemplate, footerTemplate);

		const fileName = ('filename' || '').replace(' ', '');
		return pdf.getPdfResponse(generatedPdfData, fileName);
	};

	return module;
};


