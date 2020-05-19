const {PDFDocument, rgb} = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const chromium = require('chrome-aws-lambda');

async function getPdfBytesWithPageNumbers(generatedPdf, config) {
	const {
		pageNumberTreshold = 0,
		pageNumberFontBase64,
		customPageNumberOptions = {
			right: 37,
			bottom: 22.9,
			size: 8.5
		}
	} = config;

	const pdfDoc = await PDFDocument.create();
	pdfDoc.registerFontkit(fontkit);
	const originalPdf = await PDFDocument.load(generatedPdf);

	for (let i = 0; i < originalPdf.getPageCount(); i++) {
		const [aMainPage] = await pdfDoc.copyPages(originalPdf, [i]);
		pdfDoc.addPage(aMainPage);
	}
	let customFont;
	if (pageNumberFontBase64) {
		customFont = await pdfDoc.embedFont(pageNumberFontBase64);
	}

	const pages = pdfDoc.getPages();
	const {width} = pages[0].getSize();

	let pageNumberOptions = {
		x: width - customPageNumberOptions.right,
		y: customPageNumberOptions.bottom,
		size: customPageNumberOptions.size,
		color: rgb(0, 0, 0)
	};

	if (customFont) {
		pageNumberOptions = {...pageNumberOptions, font: customFont};
	}

	pages.forEach((page, index) => {
		if (index >= (pageNumberTreshold || 0)) {
			let pageNumberIndent = index > 8 ? '' : '   '; // indent single page numbers for correct right alignment
			page.drawText(pageNumberIndent + String(index + 1), pageNumberOptions);
		}
	});
	return pdfDoc.save();
}

function toArrayBuffer(buffer) {
	const arrayBuf = new ArrayBuffer(buffer.length);
	const view = new Uint8Array(arrayBuf);

	for (let i = 0; i < buffer.length; ++i) {
		view[i] = buffer[i];
	}

	return arrayBuf;
}

module.exports.getPdf = async (htmlString, config) => {
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

		const generatedPdf = await page.pdf({
			format: 'A4',
			printBackground: false,
			displayHeaderFooter: false
		});
		if (!config.renderPageNumbers) {
			return generatedPdf;
		}
		const pdfBytes = await getPdfBytesWithPageNumbers(toArrayBuffer(generatedPdf), config);
		return Buffer.from(pdfBytes);
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
