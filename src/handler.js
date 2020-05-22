module.exports = ({version, templates = {}, helpers, mocks, schema, patchDataBeforeRendering, config, fetchCb}) => {
	const pdf = require('./lib/pdf');
	const module = {};
	const atob = require('atob');
	const {validate} = require('./lib/validate');
	const {getCompiledTemplate} = require('./lib/handlebars')({helpers, partials: templates.partials});
	const configuration = config || {};

	const pipe = (...functions) => input => functions.reduce((composition, nextFunction) => composition.then(nextFunction), Promise.resolve(input));

	const handlePassThrough = func => input => {
		if (input.statusCode === 500 || input === 'Lambda is warm!') {
			return input; // pass through
		}
		return func(input)
	};

	const handlePdfWarmUp = async () => {
		await pdf.getPdf('WarmUp - Lambda is warm!', {});
		return 'Lambda is warm!';
	};

	const parseEventData = event => {
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

	const errorBody = (message = '') => {
		return {
			statusCode: 500,
			body: message
		};
	};

	const returnPdf = handlePassThrough(async patchedData => {
		const mainTemplate = getCompiledTemplate(templates.main, patchedData);

		const generatedPdfData = await pdf.getPdf(mainTemplate, configuration);

		const fileName = ((patchedData.data && patchedData.data.fileName) || configuration.fileNameFallback || '').replace(' ', '');
		return pdf.getPdfResponse(generatedPdfData, fileName);
	});

	const returnHtml = handlePassThrough(templateData => {

		const html = getCompiledTemplate(templates.main, templateData);

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'text/html'
			},
			body: html
		};
	});

	const withParser = handlePassThrough(event => {
		const parsedData = parseEventData(event);
		if (!parsedData.data) {
			return errorBody('Could not parse data');
		}
		return parsedData;
	});

	const withValidator = handlePassThrough(input => {
		const {valid, errors} = validate({schema, data: input.data});
		if (valid !== true) {
			return errorBody(JSON.stringify(errors));
		}
		return input;
	});

	const withWarmUp = handlePassThrough(async event => {
		if (event.source === 'serverless-plugin-warmup') {
			if ((event.path || '').includes('/pdf')) {
				return await handlePdfWarmUp();
			}
			return 'Lambda is warm!';
		}
		return event;
	});

	const withDataPatcher = handlePassThrough(input => patchDataBeforeRendering ? patchDataBeforeRendering(input) : input);

	const withFetchResponse = handlePassThrough(async (event) => {

		const {param} = event.pathParameters || {};
		const {queryStringParameters} = event;

		const data = await fetchCb(param, queryStringParameters, event);

		if (!data) {
			return errorBody('No fetchResponse');
		}
		return {data};
	});

	// Exported Lambda functions
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
	module.html = async event => pipe(withWarmUp, withParser, withValidator, withDataPatcher, returnHtml)(event);
	module.pdf = async event => pipe(withWarmUp, withParser, withValidator, withDataPatcher, returnPdf)(event);
	module.fetchHtml = async event => pipe(withWarmUp, withFetchResponse, withValidator, withDataPatcher, returnHtml)(event);
	module.fetchPdf = async event => pipe(withWarmUp, withFetchResponse, withValidator, withDataPatcher, returnPdf)(event);


	return module;
};
