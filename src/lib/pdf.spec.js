const pdf = require('./pdf');
describe('pdf module', function () {
	describe('getPdfResponse function', () => {
		it('should return correct return object', async () => {
			const mockPdfData = 'I am a pdf';
			const result = pdf.getPdfResponse(mockPdfData, 'foobar');
			expect(result.body).toBe(mockPdfData);
			expect(result.statusCode).toBe(200);
		});
	});

	describe('getPdf function', () => {
		it('should return pdf file without pagenumbers', async () => {
			const mockPdfData = 'I am a pdf';
			const result = await pdf.getPdf(mockPdfData, {
				renderPageNumbers: false
			});
			expect(result).toBeDefined();
		});

		it('should return pdf file with pagenumbers', async () => {
			const {StandardFonts} = require('pdf-lib');			const mockPdfData = 'I am a pdf';
			const result = await pdf.getPdf(mockPdfData, {
				renderPageNumbers: true, // should render pagenumbers?
				pageNumberTreshold: 0, // render pagenumber from ?
				fallbackFontCdnUrl: "https://rawcdn.githack.com/googlefonts/noto-cjk/be6c059ac1587e556e2412b27f5155c8eb3ddbe6/NotoSansCJK-Regular.ttc", // fallback font for asian text, has to be a cdn url
				fileNameFallback: "helloworld", // embed fileName in passed data, this is the fallback
				customPageNumberOptions: { // px
					right: 37, // right margin
					bottom: 22.9, // bottom margin
					size: 8.5 // font size
				},
				pageNumberFontBase64: StandardFonts.Helvetica
			});
			expect(result).toBeDefined();
		});

		it('should return false', async () => {
			const chromium = require('chrome-aws-lambda');
			jest.spyOn(chromium.puppeteer, 'launch').mockReturnValue(Promise.reject());

			const mockPdfData = null;
			const result = await pdf.getPdf(mockPdfData, {
				renderPageNumbers: false
			});
			expect(result).toBeFalsy();
		});
	});
});

