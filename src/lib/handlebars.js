module.exports = ({helpers = {}, partials = {}}) => {
	const Handlebars = require('handlebars');

	Object.entries(helpers).forEach(([name, func]) => {
		Handlebars.registerHelper(name, func);
	});

	Handlebars.registerPartial(partials);

	const module = {};
	module.getCompiledTemplate = (template, context) => {
		if (context) {
			const compiled = Handlebars.compile(template);
			return compiled(context);
		}
		return Handlebars.compile(template);
	};

	return module;
};



