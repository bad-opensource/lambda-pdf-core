module.exports = ({version, templates = {}, helpers, mocks, schema}) => {
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

		// patchMediaUrlsWithDownsize(parsedData.data.media);

		const html = getCompiledTemplate(templates.main, parsedData);

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'text/html'
			},
			body: html
		};
	};

	return module;
};



//
// const patchMediaUrlsWithDownsize = media => {
// 	if (!media) {
// 		return {};
// 	}
// 	const mediaCopy = {...media};
// 	Object.keys(mediaCopy).forEach(key => {
// 		if (!!mediaCopy[key].url) {
// 			mediaCopy[key].url = mediaCopy[key].url + '?downsize=500px:*'
// 		}
// 	});
// 	return mediaCopy;
// };
//
// /**
//  * getPdf - pdf route handler
//  * @param {event} event event
//  * @returns {Promise<{body: string, statusCode: number}|{headers: {'Content-type': string, 'content-disposition': string}, isBase64Encoded: boolean, body: string, statusCode: number}>} pdf
//  */
// module.exports.getPdf = async event => {
// 	console.time('getPdf');
// 	const pdf = require('./lib/pdf');
// 	console.time('getAudiCodeData');
// 	const audiCodeData = getAudiCodeData(event);
// 	if (!audiCodeData) {
// 		return errorBody('No Data for audiCodeData');
// 	}
//
//
// 	console.timeEnd('getAudiCodeData');
//
// 	console.time('validate');
// 	const {valid, errors} = validate({schema, data: audiCodeData.data});
// 	if (valid !== true) {
// 		return errorBody(JSON.stringify(errors));
// 	}
// 	console.timeEnd('validate');
//
// 	patchMediaUrlsWithDownsize(audiCodeData.data.media);
//
// 	console.time('compileTemplates');
// 	const legacyPdfTemplate = getCompiledTemplate('legacy-pdf', audiCodeData);
// 	const footerTemplate = getCompiledTemplate('partials/footer', audiCodeData);
// 	const headerTemplate = getCompiledTemplate('partials/header', audiCodeData);
// 	console.timeEnd('compileTemplates');
//
// 	console.time('generatedPdfData');
// 	const generatedPdfData = await pdf.getPdf(legacyPdfTemplate, headerTemplate, footerTemplate);
// 	console.timeEnd('generatedPdfData');
//
// 	const fileName = (audiCodeData.data.header.title || '').replace(' ', '');
//
// 	console.timeEnd('getPdf');
// 	return pdf.getPdfResponse(generatedPdfData, fileName);
// };
//
// /**
//  * getHtml - html route handler
//  * @param {event} event event
//  * @returns {Promise<{headers: {'Content-Type': string}, body: (null|string|HandlebarsTemplateDelegate<any>), statusCode: number}|{body: string, statusCode: number}>} html
//  */



