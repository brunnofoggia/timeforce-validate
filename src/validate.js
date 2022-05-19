// [validate-99xp](https://github.com/brunnofoggia/timeforce-validate) is the automated way
// to keep your json or model attributes valid. See [v8n-99xp](https://github.com/brunnofoggia/v8n-99xp)
// and [v8n](https://imbrn.github.io/v8n/) or [joi](https://joi.dev/)
// to know more about validators available

// Instructions
// --------------

// To make a field mandatory set it equal to [] or set your rules instead

//     var validations = { name: [] }

//     var validations = { name: [ [v8n().fullname(), 'Enter your fullname'] ] }

// To make a field not mandatory you can either no list it in your stack of field validations of set it to false

//     var validations = { name: false }

// Advanced topics:

// 1. You can also send a function for validations so you can define your rules according to values received

// 2. On rule array you can send a third value that is called 'getValue'.
// That will be a function responsible for return a value to be validated for that field

//     var validations = { name: [ [v8n().fullname(), 'Enter your fullname', ()=>{ return 'any other variable'; }] ] }

// 3. If you want to test a value received in realtime from user input set validateAll to false

//     vl.validate({ name: '99xp' }, {validateAll: false})

// 4. Complex objects works well too.

//     var json = {name: '99xp', contacts: [ {email: 'team@99xp.org'} , {email: 'admin@99xp.org'} ]};
//     var validations = {name: [], 'contacts[][email]': []};
//     vl.validate(json, {validations})

// Examples
// --------------

//     - simple validation
//     var validations = { name: [ [v8n().fullname(), 'Enter your fullname'] ] }
//     var json = { name: 'bruno' }
//     var r;
//     if((r = vl.validate(json, {validations}))!==null) {
//          console.log(r);
//     }

//     - making a field just mandatory
//     var validations = { name: [] }
//     var json = { name: 'bruno' }
//     var r;
//     if((r = vl.validate(json, {validations}))!==null) {
//          console.log(r);
//     }

// CODE DOCUMENTED BELOW
// --------------

// --------------

// Baseline setup
// --------------
import _ from 'lodash';
import validators from './validators.js';
import { Deep } from 'timeforce';

var validate = {
	validators,
	validator: null, //() => [validator, config],
	_validator(returnConfig = false) {
		var _validator = _.result(this, 'validator');
		return _validator && _validator[!returnConfig ? 0 : 1];
	},
	deepValueSearch: Deep.search,
	validateAll: true,
	_validate(data, options) {
		if (options.validate === false || !this.validate) {
			return true;
		}

		var _data = _.defaultsDeep(Deep.split(data), _.cloneDeep(this.attributes || {}));
		this.validationError = this.validate(_data, options);
		if (!this.validationError && options.validateForServer && _.size(this.serverValidations || {}) > 0) {
			// used to format data before sending it to server
			var _json = this.toJSON ? this.toJSON({ data: _data }) : _data;
			// runs validations over a formatted object to check, for example, the type of the data
			this.validationError = this.validate(_json, _.defaults({ validations: this.serverValidations }, options));
		}

		if (!this.validationError) {
			return true;
		}

		this.trigger && this.trigger(
			'invalid',
			this,
			this.validationError,
			_.extend(options, { validationError: this.validationError })
		);
		return false;
	},
	// Core method the walk through fields and their set of rules applying each one of them
	validate(data, options = {}) {
		if (!this._validator()) return null;
		var _data = _.cloneDeep(data);
		options = _.defaults(options, {
			validateAll: this.validateAll,
		});

		var error = [],
			validations = this.getValidations(_data, options),
			notEmptyValidation = this.nonEmptyValidation(),
			isRequired = {};

		// walk through fields listed as required
		for (let validationsGroup in validations) {
			isRequired[validationsGroup] = true;
			let value = this.deepValueSearch(_data, validationsGroup);

			let errorMessage;

			// working with array so we can validate lists like 'contacts[][email]'
			((!_.isArray(value) && !_.isPlainObject(value)) ||
				(!/\.\.\w+/.test(validationsGroup) && _.isArray(value))) && // ensure to pass the correct value to test length of lists
				(value = [value]);
			!_.isArray(validations[validationsGroup]) &&
				(validations[validationsGroup] = [validations[validationsGroup]]);

			// walk through field rule specifications
			for (let rule in validations[validationsGroup]) {
				let validation = validations[validationsGroup][rule];

				if (!parseInt(rule, 10) && typeof validation === 'string') {
					// first item of the array can be a global message for all validations of that group
					errorMessage = validation;
					continue;
				} else if (!_.isArray(validation)) {
					// keep validations as an array
					validation = [validation];
				}

				// default error messages
				if (!validation[1]) {
					validation[1] = errorMessage || this.getRequiredErrorMessage(validationsGroup)
				}

				// default value substitution for true on validation interceptor
				validation[2] === true && (validation[2] = (_value, _attrs, _field) => [_value, _attrs, _field]);

				if (
					typeof validation[0] === 'boolean' ||
					typeof validation[0] === 'undefined'
				) {
					isRequired[validationsGroup] = validation !== false;

					if (!isRequired[validationsGroup]) {
						continue;
					}

					// if is required, set default validation and error message for it
					validation = [
						notEmptyValidation,
						validation[1] || errorMessage || this.getRequiredErrorMessage(validationsGroup),
						validation[2] || null,
					];
				}

				error = error.concat(
					this.validateValues(
						value,
						isRequired[validationsGroup],
						options.validateAll,
						validationsGroup,
						_data,
						validation
					)
				);
			}
		}

		return error.length > 0 ? error : null;
	},
	nonEmptyValidation() {
		var _validatorProxy = this._validator(true),
			_validatorConfig = this._validator()
		return _validatorProxy && _validatorProxy.nonEmptyValidation(_validatorConfig);
	},
	validateValues(value, isRequired, validateAll, field, data, validation) {
		var error = [];
		for (var x in value) {
			// skip deleted items from object
			if (value[x] === SyntaxError) { continue; }

			error = error.concat(
				this.validateValue(
					x,
					value[x],
					isRequired,
					validateAll,
					field.replace('..', `.${x}.`),
					data,
					validation
				)
			);
		}

		return error;
	},
	validateValue(x, value, isRequired, validateAll, field, data, validation) {
		var error = [];
		let validationValue = this.getValidationValue(
			validation,
			value,
			data,
			field
		);
		if (
			this.isRequiredNow(validationValue, isRequired, validateAll) &&
			!this.isValid(field, validationValue, validation[0], data)
		) {
			error.push([field, validation[1], x]);
		}

		return error;
	},
	getValidationValue(validation, value, data, field) {
		if (!validation[2] || typeof validation[2] !== 'function') {
			return value;
		}

		return validation[2](value, data, field);
	},
	getValidations(attrs, options = {}) {
		var definedValidations = (typeof this.validations === 'function' ? this.validations(attrs, options) : this.validations) || {},
			validations = (typeof options.validations === 'function' ? _.bind(options.validations, this)(attrs, options) : options.validations) || definedValidations;

		return validations;
	},
	// Run through all validations to collect mandatory fields and validations
	getMandatoryValidations(attrs, options = {}) {
		var validations = this.getValidations(attrs, options),
			mandatory = {};

		// walk through fields listed as required
		for (let field in validations) {
			!_.isArray(validations[field]) &&
				(validations[field] = [validations[field]]);
			// walk through field rule specifications
			for (let x in validations[field]) {
				let validation = validations[field][x];
				let data = {};
				data.test = '';

				if (
					typeof validation[0] === 'undefined' ||
					(typeof validation[0] === 'boolean' &&
						validation[0] !== false) ||
					(typeof validation[0] === 'object' &&
						!this.isValid(field, '', validation[0], data))
				) {
					!(field in mandatory) && (mandatory[field] = []);
					mandatory[field].push(validation);
				}
			}
		}

		return mandatory;
	},
	// A field will be required when its present in the set of rules - even if its value is an empty [] -
	// AND (its present in the values received OR (its set as required and validate all was set true)) .
	// A bit confusing I know. But this will allow you to run validate in your form everytime a field is changed avoiding
	// to alert of invalid fields that yet weren't filled by the guest
	isRequiredNow(input, fieldRequired = false, validateAll) {
		// the field will be required only if its value was sent or if its set as required (even without a specific rule)
		return (
			typeof input !== 'undefined' || (!!fieldRequired && !!validateAll)
		);
	},
	// Apply the rule test to value received. value, attrs inputted and field name are sent to validation method - it can be handy.
	isValid(field, value, validation, data) {
		var validatorConfig = this._validator(true),
			validator = this._validator();
		return validatorConfig.isValid(validator, validation, value, field, data);
	},
	requiredErrorMessage: 'Field *{{field}}* cannot be empty',
	getRequiredErrorMessage(field) {
		return _.template(this.requiredErrorMessage)({
			field,
		});
	},
	validatorDetection(compare) {
		var _validator = this._validator(true);
		return _validator && _validator.id === compare;
	}
};

// Mix in each Validate methods as a proxy to `Models`.
var mix = function (Model, validatorConfigFn) {
	_.each(validate, function (fn, method) {
		Model.prototype[method] = fn;
	});
	if (validatorConfigFn) { Model.prototype.validator = validatorConfigFn; }
}

export { validate, mix };
export default validate;
