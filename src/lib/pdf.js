const {PDFDocument} = require('pdf-lib');
const chromium = require('chrome-aws-lambda');

module.exports.handleWarmUp = async () => {
	await module.exports.getPdf('WarmUp - Lambda is warm!', {});
	return 'Lambda is warm!';
};

async function getCombinedPdf(page, basicOptions, config) {
	const firstPageBuffer = await page.pdf({
		...basicOptions,
		displayHeaderFooter: false,
		margin: {
			top: 0,
			right: config.margin.right ? config.margin.right : '1cm',
			bottom: 0,
			left: config.margin.left ? config.margin.left : '1cm'
		},
		pageRanges: '1'
	});

	const otherPagesBuffer = await page.pdf({
		...basicOptions,
		pageRanges: '2-'
	});

	const combinedPdf = await PDFDocument.create();

	const [firstPagePdf, otherPagesPdf] = await Promise.all([PDFDocument.load(firstPageBuffer), PDFDocument.load(otherPagesBuffer)]);


	const [firstPage] = await combinedPdf.copyPages(firstPagePdf, [0]);
	combinedPdf.addPage(firstPage);

	const otherPagesPromises = [];
	for (let i = 0; i < otherPagesPdf.getPageCount(); i++) {
		otherPagesPromises.push(combinedPdf.copyPages(otherPagesPdf, [i]));
	}
	const pages = await Promise.all(otherPagesPromises);
	pages.forEach(page => {combinedPdf.addPage(page[0])})

	const pdfBytes = await combinedPdf.save();
	return Buffer.from(pdfBytes);
}

module.exports.getPdf = async (htmlString, config, header = '', footer = '') => {
	if (!!config.fallbackFontCdnUrl) {
		await chromium.font(config.fallbackFontCdnUrl);
	}
	let browser;

	try {
		browser = await chromium.puppeteer.launch({
			args: chromium.args,
			defaultViewport: chromium.defaultViewport,
			executablePath: await chromium.executablePath,
			headless: true
		});
		const page = await browser.newPage();
		await page.setContent(htmlString);
		const basicOptions = {
			format: 'A4',
			printBackground: false,
			displayHeaderFooter: true,
			headerTemplate: header,
			footerTemplate: footer,
			margin: config.margin ? config.margin : '1cm'
		};
		if (config.differentCoverLetter) {
			return await getCombinedPdf(page, basicOptions, config);
		}
		else {
			return await page.pdf({
				...basicOptions,
			});
		}
	}
	catch (e) {
		console.log(e);
		return false;
	}
	finally {
		if (browser) {
			await browser.close();
		}
	}
};

module.exports.getPdfResponse = (generatedPdfData, fileName = '') => {
	const ascii = /^[ -~]+$/;
	const asciiCheckedFileName = ascii.test(fileName) ? fileName : 'pdf';

	return {
		isBase64Encoded: true,
		headers: {
			'Content-Type': 'application/pdf',
			'content-disposition': `attachment; filename=${asciiCheckedFileName}.pdf`
		},
		statusCode: 200,
		body: generatedPdfData.toString('base64')
	};
};
