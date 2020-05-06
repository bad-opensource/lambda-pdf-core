const pdf = require('./pdf');

describe('pdf modules getPdfResponse', () => {
	it('should return correct return object', async () => {
		const mockPdfData = 'I am a pdf';
		const result = pdf.getPdfResponse(mockPdfData, 'foobar');
		expect(result.body).toBe(mockPdfData);
		expect(result.statusCode).toBe(200);
	});
});
