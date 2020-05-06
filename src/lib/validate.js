const Ajv = require('ajv');
const ajv = new Ajv({allErrors: true});

module.exports.validate = ({schema = {}, data = {}}) => {
	const validate = ajv.compile(schema);
	const valid = validate(data);

	if (!valid){
		const errors = validate.errors;
		return {valid: false, errors}
	}
	return {valid: true, errors: null};
};
