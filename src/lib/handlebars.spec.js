const Handlebars = require('handlebars');
const handlebars = require('./handlebars');

describe('handlebars module', () => {
	const helpers = {
		foo: () => {},
		bar: () => {}
	};
	const partials = {
		foo: {},
		bar: {},
		baz: {}
	};

	it('init should register helpers and partials', () => {
		const helpersSpy = jest.spyOn(Handlebars, 'registerHelper');
		const partialsSpy = jest.spyOn(Handlebars, 'registerPartial');

		handlebars({helpers, partials});
		expect(helpersSpy).toHaveBeenCalledTimes(2);
		expect(partialsSpy).toHaveBeenCalledTimes(1);

	});

	it('getCompiledTemplate should return compiled handlebars template', () => {
		const instance = handlebars({helpers: {},partials: {}});
		const compile = instance.getCompiledTemplate('Foo');
		expect(compile()).toBe('Foo');

		const template = `foo {{this.bar}}`;
		const context = {bar: 'bar baz'};
		const compiled = instance.getCompiledTemplate(template, context);
		expect(compiled).toBe('foo bar baz');
	});
});




