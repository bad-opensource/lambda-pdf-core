module.exports = ({version, templates = {}, helpers, mocks, schema, patchDataBeforeRendering, config, fetchCb}) => {
	const pdf = require('./lib/pdf');
	const module = {};
	const atob = require('atob');
	const {validate} = require('./lib/validate');
	const {getCompiledTemplate} = require('./lib/handlebars')({helpers, partials: templates.partials});
	const configuration = config || {};

	const handleWarmup = async () => {
		await pdf.getPdf('WarmUp - Lambda is warm!', {});
		console.log('WarmUp - Lambda is warm!');
		return 'Lambda is warm!';
	};

	const returnPdf = async (getCompiledTemplate, templates, patchedData, configuration) => {
		const mainTemplate = getCompiledTemplate(templates.main, patchedData);

		const generatedPdfData = await pdf.getPdf(mainTemplate, configuration);

		const fileName = ((patchedData.data && patchedData.data.fileName) || configuration.fileNameFallback || '').replace(' ', '');
		return pdf.getPdfResponse(generatedPdfData, fileName);
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

	const returnHtml = (templateData) => {
		const html = getCompiledTemplate(templates.main, templateData);

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'text/html'
			},
			body: html
		};
	};

	const createFetchResponse = async (isPdfPath, patchedData) => {
		if (isPdfPath) {
			return returnPdf(getCompiledTemplate, templates, {data: patchedData}, configuration);
		}
		return returnHtml({data: patchedData});
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
		const parsedData = parseEventData(event);
		if (!parsedData.data) {
			return errorBody('No parsedData');
		}

		const {valid, errors} = validate({schema, data: parsedData.data});
		if (valid !== true) {
			return errorBody(JSON.stringify(errors));
		}

		const patchedData = patchDataBeforeRendering ? patchDataBeforeRendering(parsedData) : parsedData;
		return returnHtml(patchedData);
	};

	module.pdf = async event => {
		if (event.source === 'serverless-plugin-warmup') {
			return await handleWarmup();
		}

		const parsedData = parseEventData(event);
		if (!parsedData.data) {
			return errorBody('No Data for parsedData');
		}

		const {valid, errors} = validate({schema, data: parsedData.data});
		if (valid !== true) {
			return errorBody(JSON.stringify(errors));
		}

		const patchedData = patchDataBeforeRendering ? patchDataBeforeRendering(parsedData) : parsedData;

		return await returnPdf(getCompiledTemplate, templates, patchedData, configuration);
	};

	module.fetch = async event => {
		if (event.source === 'serverless-plugin-warmup') {
			return await handleWarmup();
		}

		const {param} = event.pathParameters || {};
		const {queryStringParameters} = event;
		const isPdfPath = (event.path ||'').includes('/pdf');

		const fetchResponse =  await fetchCb(param, queryStringParameters, event);

		if (!fetchResponse) {
			return errorBody('No fetchResponse');
		}

		const {valid, errors} = validate({schema, data: fetchResponse});
		if (valid !== true) {
			return errorBody(JSON.stringify(errors));
		}

		const patchedData = patchDataBeforeRendering ? patchDataBeforeRendering(fetchResponse) : fetchResponse;

		return await createFetchResponse(isPdfPath, patchedData);
	};

	return module;
};


