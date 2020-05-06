const {validate} = require('./validate');

describe('validate module', () => {
	const scheme = {
		'properties': {
			'value1': {'type': 'number'},
			'value2': {'type': 'string'}
		}
	};

	it('should return {true, null} if data is valid', () => {
		const data = {
			value1: 1,
			value2: "Foobar"
		};
		const {valid, errors} = validate({scheme, data});

		expect(valid).toBeTruthy();
		expect(errors).toBe(null);
	});

	it('should return {false, errors} if data is not valid', () => {
		const data2 = {
			value1: "FooBarBaz",
			value2: "Foobar"
		};
		const {valid, errors} = validate({scheme, data: data2});

		expect(valid).toBe(false);
		expect(errors[0].message).toBe('should be number');
	});
});
