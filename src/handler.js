module.exports = ({version, templates = {}, helpers, mocks, schema, patchDataBeforeRendering, config, fetchCb}) => {
	const pdf = require('./lib/pdf');
	const module = {};
	const {getCompiledTemplate} = require('./lib/handlebars')({helpers, partials: templates.partials});
	const {pipe, parseEventData, showError} = require('./lib/utils');

	const addPassThroughHandling = func => input => {
		if (input.statusCode === 500 || input === 'Lambda is warm!') {
			return input; // pass through
		}
		return func(input)
	};

	const returnPdf = addPassThroughHandling(async patchedData => {
		const configuration = config || {};
		const mainTemplate = getCompiledTemplate(templates.main, patchedData);
		const headerTemplate = getCompiledTemplate(templates.header, patchedData);
		const footerTemplate = getCompiledTemplate(templates.footer, patchedData);

		const generatedPdfData = await pdf.getPdf(mainTemplate, configuration, headerTemplate, footerTemplate);

		const fileName = ((patchedData.data && patchedData.data.fileName) || configuration.fileNameFallback || '').replace(' ', '');
		return pdf.getPdfResponse(generatedPdfData, fileName);
	});

	const returnHtml = addPassThroughHandling(templateData => {

		const html = getCompiledTemplate(templates.main, templateData);

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'text/html'
			},
			body: html
		};
	});

	const returnDebug = addPassThroughHandling(templateData => {
		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(templateData)
		};
	});

	const parse = addPassThroughHandling(event => {
		const parsedData = parseEventData(event, mocks);
		if (!parsedData.data) {
			return showError('Could not parse data');
		}
		return parsedData;
	});

	const validate = addPassThroughHandling(input => {
		const {validate} = require('./lib/validate');
		const {valid, errors} = validate({schema, data: input.data});
		if (valid !== true) {
			return showError(JSON.stringify(errors));
		}
		return input;
	});

	const warmUp = addPassThroughHandling(async event => {
		if (event.source === 'serverless-plugin-warmup') {
			return pdf.handleWarmUp();
		}
		return event;
	});

	const patchData = addPassThroughHandling(input => patchDataBeforeRendering ? patchDataBeforeRendering(input) : input);

	const fetchData = addPassThroughHandling(async event => {
		const {param} = event.pathParameters || {};
		const {queryStringParameters} = event;

		try {
			const data = await fetchCb(param, queryStringParameters, event);

			if (!data) {
				return showError('No fetchResponse');
			}
			return {data};
		}
		catch (err) {
			return showError(err.message);
		}
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

	module.html = async event => pipe(warmUp, parse, validate, patchData, returnHtml)(event);
	module.pdf = async event => pipe(warmUp, parse, validate, patchData, returnPdf)(event);
	module.debug = async event => pipe(warmUp, parse, validate, patchData, returnDebug)(event);
	module.fetchHtml = async event => pipe(warmUp, fetchData, validate, patchData, returnHtml)(event);
	module.fetchPdf = async event => pipe(warmUp, fetchData, validate, patchData, returnPdf)(event);
	module.fetchDebug = async event => pipe(warmUp, fetchData, validate, patchData, returnDebug)(event);

	return module;
};
