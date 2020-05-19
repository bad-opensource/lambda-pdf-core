// const pdf = require('./lib/pdf');

describe('handler module', () => {
	const templates = {
		check: `<h1>{{{version}}} up and running</h1>`,
		main: `<h1>Main Template</h1>`
	};

	let fetchReturnValue;

	const mock = {
		fetchCb : () => {
			return Promise.resolve(fetchReturnValue)
		}
	};
	const handler = require('./handler')({
		version: '1.0.0',
		templates,
		schema: {
			"type": "object",
			"properties": {"foo": {type: "string"}}
		},
		config: {},
		mocks: {},
		helpers: {},
		fetchCb: mock.fetchCb
	});

	describe('check handler function', () => {
		it('should return check page html with status code 200', async () => {
			const result = await handler.check();
			expect(result.statusCode).toBe(200);
			expect(result.body).toBe("<h1>1.0.0 up and running</h1>");
		});
	});

	describe('html handler function', () => {
		it('should return statusCode 500 if event data ist empty', async () => {
			const event = {};
			const result = await handler.html(event);
			expect(result.statusCode).toBe(500);
		});

		it('should return statusCode 200 when event body is base64 encoded', async () => {
			const event = {
				body: "eyJmb28iOiAiYmFyIGJheiJ9",
				isBase64Encoded: true
			};
			const result = await handler.html(event);
			expect(result.body).toBe("<h1>Main Template</h1>");
			expect(result.statusCode).toBe(200);
		});

		it('should return statusCode 200 when event body object string', async () => {
			const event = {
				body: '{"foo": "bar baz"}',
				isBase64Encoded: false
			};
			const result = await handler.html(event);
			expect(result.body).toBe("<h1>Main Template</h1>");
			expect(result.statusCode).toBe(200);
		});

		it('should return statusCode 500 when event body cannot be parsed', async () => {
			const event = {
				body: '',
				isBase64Encoded: false
			};
			const result = await handler.html(event);
			expect(result.body).toBe("No parsedData");
			expect(result.statusCode).toBe(500);
		});

		it('should return error when schema isnt valid', async () => {
			const event = {
				body: '{"foo": 1}',
				isBase64Encoded: false
			};
			const result = await handler.html(event);
			expect(result.body).toBe("[{\"keyword\":\"type\",\"dataPath\":\".foo\",\"schemaPath\":\"#/properties/foo/type\",\"params\":{\"type\":\"string\"},\"message\":\"should be string\"}]");
		});
	});

	describe('pdf handler function', () => {
		it('should call warmup function when event.source is serverless-plugin-warmup', async () => {
			const event = {
				source: 'serverless-plugin-warmup'
			};
			const result = await handler.pdf(event);
			expect(result).toBe("Lambda is warm!");
		});

		it('should return statusCode 200 when pdf is returned', async () => {
			const event = {
				body: '{"foo": "bar baz"}',
				isBase64Encoded: false
			};
			const result = await handler.pdf(event);
			expect(result.statusCode).toBe(200);
		});

		it('should return error when schema isnt valid', async () => {
			const event = {
				body: '{"foo": 1}',
				isBase64Encoded: false
			};
			const result = await handler.pdf(event);
			expect(result.body).toBe("[{\"keyword\":\"type\",\"dataPath\":\".foo\",\"schemaPath\":\"#/properties/foo/type\",\"params\":{\"type\":\"string\"},\"message\":\"should be string\"}]");
		});

		it('should return statusCode 500 if event data ist empty', async () => {
			const event = {};
			const result = await handler.pdf(event);
			expect(result.statusCode).toBe(500);
		});
	});

	describe('fetch handler function', () => {
		it('should call warmup function when event.source is serverless-plugin-warmup', async () => {
			const event = {
				source: 'serverless-plugin-warmup'
			};
			const result = await handler.fetch(event);
			expect(result).toBe("Lambda is warm!");
		});

		it('should return error body when fetchCb does not return data', async () => {
			const event = {};
			const result = await handler.fetch(event);
			expect(result.statusCode).toBe(500);
		});

		it('should return status 200 for html path', async () => {
			const event = {};
			fetchReturnValue = {"foo": "bar baz"};
			const result = await handler.fetch(event);
			expect(result.statusCode).toBe(200);
		});

		it('should return status 200 for pdf path', async () => {
			const event = {
				path: '/pdf'
			};
			fetchReturnValue = {"foo": "bar baz"};
			const result = await handler.fetch(event);
			expect(result.statusCode).toBe(200);
		});

		it('should return error body when data isnt valid with schema', async () => {
			const event = {};
			fetchReturnValue = {"foo": 1};
			const result = await handler.fetch(event);
			expect(result.statusCode).toBe(500);
		});

	});

});