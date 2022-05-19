import _ from 'lodash';

var validators = {
	V8N: {
		id: 0,
		isValid(validator, validation, value, field, data) {
			if (!validation.test(value)) {
				return false;
			}
			return true;
		},
		nonEmptyValidation(validator) {
			return validator.passesAnyOf(
				validator.minLength(1),
				validator.not.undefined().not.null().pattern(/.+/)
			);
		}
	},
	JOI: {
		id: 1,
		isValid(validator, validation, value, field, data) {
			var schema = {};
			schema.__field = validation;
			var _data = _.defaultsDeep({ __field: value }, data);
			var joiSchema = validator.object(schema);

			var result = validation.validate ? validation.validate(value, { presence: 'required' }) : joiSchema.validate(_data, { presence: 'required', allowUnknown: true });
			if (result.error) {
				return false;
			}
			return true;
		},
		nonEmptyValidation(validator) {
			var validate = (value) => (typeof value === 'string' ? validator.string().min(1) : validator.required()).validate(value, { presence: 'required' });
			return { validate };
		},
	},
};

export default validators;
