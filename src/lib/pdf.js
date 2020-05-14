const {PDFDocument, rgb} = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const chromium = require('chrome-aws-lambda');

//TODO: der muss die config aus dem base projekt bekommen und verarbeiten ( font für font-link für asien,
// pagenumberfont (in welcher form auch immer)
// file name ???

module.exports.getPdf = async (htmlString, config) => {
	// await chromium.font('https://rawcdn.githack.com/googlefonts/noto-cjk/be6c059ac1587e556e2412b27f5155c8eb3ddbe6/NotoSansCJK-Regular.ttc');
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
		// return generatedPdf;
		const pdfDoc = await PDFDocument.create();
		pdfDoc.registerFontkit(fontkit);
		const originalPdf = await PDFDocument.load(generatedPdf);
		for (let i = 0; i < originalPdf.getPageCount(); i++) {
			const [aMainPage] = await pdfDoc.copyPages(originalPdf, [i]);
			pdfDoc.addPage(aMainPage);
		}
		// let customFont = await pdfDoc.embedFont(fontBase64);
		const pages = pdfDoc.getPages();
		const {width} = pages[0].getSize();
		let pageNumberOptions = {
			x: width - 37,
			y: 22.9,
			size: 8.5,
			color: rgb(0, 0, 0)
		};
		// if (customFont) {
		// 	pageNumberOptions = {...pageNumberOptions, font: customFont};
		// }
		pages.forEach((page, index) => {
			if (index) {
				let pageNumberIndent = index > 8 ? '' : '   ';
				page.drawText(pageNumberIndent + String(index + 1), pageNumberOptions);
			}

		});
		const pdfBytes = await pdfDoc.save();
		console.timeEnd('addPageNumber');
		return Buffer.from(pdfBytes);
		// add page number


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
