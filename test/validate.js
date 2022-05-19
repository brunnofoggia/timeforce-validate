import assert from 'assert';
import v8n from 'v8n-99xp';
import Joi from 'joi';
import _ from 'lodash';
import { validate as v, mix } from '../src/validate.js';

describe('No validator', function () {

	it('working without validation', () => {
		var validations = { name: [[v8n().fullname(), 'Enter your fullname']] }
		var json = { name: 'bruno foggia' };

		assert.ok((v.validate(json, { validations })) === null);
	});
});

describe('Validate tests with v8n', function () {
	beforeEach(async (done) => {
		v.validator = () => [v8n(), v.validators.V8N];
		done();
	});

	it('validator detection', () => {
		assert.ok(v.validatorDetection(v.validators.V8N.id));
	});

	// simple
	it('simple json > fullname sent > valid !', () => {
		var validations = { name: [[v8n().fullname(), 'Enter your fullname']] }
		var json = { name: 'bruno foggia' };

		assert.ok((v.validate(json, { validations })) === null);
	});

	it('simple json > first name sent > invalid !', () => {
		var validations = { name: [[v8n().fullname(), 'Enter your fullname']] }
		var json = { name: 'bruno' }

		assert.ok((v.validate(json, { validations })) !== null)
	});

	// overriding validations
	it('overriding validations !', () => {
		var validations = { name: [[v8n().fullname(), 'Enter your fullname']] }
		var overValidations = { name: [[v8n().minLength(5), '5 char needed']] }
		var json = { name: 'bruno' }

		v.validations = validations;
		assert.ok((v.validate(json, { validations: overValidations })) === null);
	});

	// automated nonempty validation
	it('automated nonempty validation > fullname and age not sent > invalid !', () => {
		var validations = { name: true, age: true }
		var json = {};
		var errors = v.validate(json, { validations });

		assert.ok(typeof errors === 'object' && errors.length === 2);
	});

	// single complex 1
	it('single complex 1 json > fullname and email sent > valid !', () => {
		var validations = { name: [], 'contacts.email': [[v8n().email(), 'invalid email']] }
		var json = {
			name: 'bruno foggia', contacts: {
				email: 'team@99xp.org'
			}
		}

		assert.ok((v.validate(json, { validations })) === null);
	});

	// single complex 2
	it('single complex 2 json > fullname and email sent > valid !', () => {
		var validations = { name: [], 'contacts.email.home': [[v8n().email(), 'invalid email']] }
		var json = {
			name: 'bruno foggia', contacts: {
				email: { home: 'team@99xp.org' }
			}
		}

		assert.ok((v.validate(json, { validations })) === null);
	});

	// multiple
	it('mix json > fullname and email sent > valid !', () => {
		var validations = { name: [], 'contacts.0.email': [[v8n().email(), 'invalid email']] }
		var json = {
			name: 'bruno foggia', contacts: [
				{
					email: 'team@99xp.org'
				},
			]
		}

		assert.ok((v.validate(json, { validations })) === null);
	});

	// multiple 2
	it('mix json 2 > partial validation with invalid email item on list sent > invalid !', () => {
		var validations = { name: [], 'contacts..email': [[v8n().email(), 'invalid email']] }
		var json = {
			name: 'bruno foggia', contacts: [
				{
					email: 'team@99xp.org'
				},
				{
					email: 'team@.org'
				}
			]
		};
		delete json.contacts[0];
		var r = (v.validate(json, { validations }));

		assert.ok(r !== null && r[0][2] === '1');
	});

	it('mix json 3 > fullname sent and email NOT sent > invalid !', () => {
		var validations = { name: [], 'contacts': [true], 'contacts[0][email]': [] }
		var json = {
			name: 'bruno foggia', contacts: [
			]
		}
		assert.ok((v.validate(json, { validations })) !== null);
	});

	it('mix json 4 > fullname sent and one of two contact emails NOT sent > invalid !', () => {
		var validations = {
			name: [],
			'contacts[][email]': [[v8n().email(), 'Enter a valid email']]
		}
		var json = {
			name: 'bruno foggia', contacts: [
				{
					//email: 'team@99xp.org'
				},
				{
					email: 'admin@99xp.org'
				},
			]
		}

		assert.ok((v.validate(json, { validations })) !== null);
	});

	it('mix json 5 > fullname sent and two contact emails sent > valid !', () => {
		var validations = {
			name: [],
			'contacts..email': [[v8n().email(), 'Enter a valid email']]
		}
		var json = {
			name: 'bruno foggia', contacts: [
				{
					email: 'team@99xp.org'
				},
				{
					email: 'admin@99xp.org'
				},
			]
		}

		assert.ok((v.validate(json, { validations })) === null);
	});

	it('mix json 6 > fullname, two emails, address sent correctly > valid !', () => {
		var validations = {
			name: [],
			'contacts..email': [[v8n().email(), 'Enter a valid email']],
			'address..location.street': [[v8n().string().minLength(1), 'Enter a valid address']],
		}
		var json = {
			name: 'bruno foggia', contacts: [
				{
					email: 'team@99xp.org'
				},
				{
					email: 'admin@99xp.org'
				},
			],
			address: [
				{
					zipcode: '099012123',
					num: '123',
					location: {
						zipcode: '099012123',
						street: 'lorem ipsum',
					}
				}
			],
		}

		assert.ok((v.validate(json, { validations })) === null);
	});

	it('mix json 7 > fullname, two emails, address sent without street > invalid !', () => {
		var validations = {
			name: [],
			'contacts..email': [[v8n().email(), 'Enter a valid email']],
			'address..location.street': [[v8n().string().minLength(1), 'Enter a valid address']],
		}
		var json = {
			name: 'bruno foggia', contacts: [
				{
					email: 'team@99xp.org'
				},
				{
					email: 'admin@99xp.org'
				},
			],
			address: [
				{
					zipcode: '099012123',
					num: '123',
					location: {
						zipcode: '099012123',
					}
				}
			],
		}

		assert.ok((v.validate(json, { validations })) !== null);
	});

	it('mix json 8 > fullname, two emails, address sent without location > invalid !', () => {
		var validations = {
			name: [],
			'contacts..email': [[v8n().email(), 'Enter a valid email']],
			'address..location.street': [[v8n().string().minLength(1), 'Enter a valid address']],
			'data..document': [[true, 'Enter a valid document']],
		}
		var json = {
			name: 'bruno foggia', contacts: [
				{
					email: 'team@99xp.org'
				},
				{
					email: 'admin@99xp.org'
				},
			],
			address: [
				{
					zipcode: '099012123',
					num: '123'
				},
				{
					zipcode: '099012123',
					num: '123'
				},
			],
		}
		var errors = v.validate(json, { validations });

		assert.ok(errors.length === 2);
		assert.ok(errors[0][0] === 'address.0.location.street');
		assert.ok(errors[1][0] === 'address.1.location.street');
	});

	it('partial validation', () => {
		var validations = {
			name: true, age: true, pass: true,
			pass_2: [true,
				[
					v8n().passwordMatch(),
					null, true
				]
			]
		}
		var json = { age: 19, pass: '123', pass_2: '123' };
		var errors = v.validate(json, { validations, validateAll: false });

		assert.ok(errors === null);
	});

	it('global error message for a group of validations', () => {
		var globalMessage = 'global message';
		var validations = { name: [globalMessage, true], age: true }
		var json = {};
		var errors = v.validate(json, { validations });

		assert.ok(errors.length === 2 && errors[0][1] === globalMessage && errors[1][1] !== globalMessage);
	});

	it('server validations', () => {
		var validations = {
			pass_2: [true,
				[
					v8n().passwordMatch(),
					null, true
				]
			]
		};
		var serverValidations = {
			name: true, age: true, pass: true,
		};

		function MyClass() { }
		mix(MyClass, () => [v8n(), v.validators.V8N]);
		var object = new MyClass();
		object.validations = validations;
		object.serverValidations = serverValidations;

		var json = { age: 19, pass: '123', pass_2: '123' };
		object._validate(json, { validations, validateForServer: true });

		assert.ok(object.validationError[0][0] === 'name');
	});

	it('simple front input > fullname not sent > invalid !', () => {
		var validations = { 'user.name': [[v8n().fullname(), 'Enter your fullname']] }
		var json = { 'user.name': 'bruno' };
		v.attributes = { 'user': { name: 'bruno foggia' } };
		let result = v._validate(json, { validations });
		v.attributes = {};
		assert.ok(result === false);
	});

});


describe('Validate tests with joi', function () {
	beforeEach(async (done) => {
		v.validator = () => [Joi, v.validators.JOI];
		done();
	});

	it('validator detection', () => {
		assert.ok(v.validatorDetection(v.validators.JOI.id));

		// console.log(`test number fail`, Joi.number().validate('bruno'));
		// console.log(`test undefined pass`, Joi.number().validate(undefined));
		// console.log(`test presence fail`, Joi.number().validate(undefined, { presence: "required" }));
		// console.log(`test alternatives pass`, Joi.alternatives().try(Joi.number(), Joi.string()).validate('bruno'));

		// var myRequired = v.validators.JOI.nonEmptyValidation(Joi);

		// console.log(`test required string pass`, myRequired.validate('bruno'));
		// console.log(`test required fail`, myRequired.validate(undefined));
		// console.log(`test required with presence fail`, myRequired.validate(undefined, { presence: "required" }));
		// console.log(`test required number 0`, myRequired.validate(0));
		// console.log(`test required number 1`, myRequired.validate(1));
		// console.log(`test required number -1`, myRequired.validate(-1));
		// console.log(`test required bool false`, myRequired.validate(false));
		// console.log(`test required bool true`, myRequired.validate(true));
		// console.log(`test required bool []`, myRequired.validate([]));
		// console.log(`test required bool {}`, myRequired.validate({}));
		// console.log(`test required bool empty string fail`, myRequired.validate(''));
	});

	// automated nonempty validation
	it('automated nonempty validation > fullname and age sent > valid !', () => {
		var validations = { name: true, age: true }
		var json = { name: 'bruno', age: 99 };
		var errors = v.validate(json, { validations });

		assert.ok(errors === null);
	});

	it('automated nonempty validation > fullname and age not sent > invalid !', () => {
		var validations = { name: true, age: true }
		var json = {};
		var errors = v.validate(json, { validations });

		assert.ok(typeof errors === 'object' && errors.length === 2);
	});

	it('partial + ref validation', () => {
		var validations = {
			name: true, age: true, pass: true,
			pass_2: [
				true,
				[
					Joi.ref('pass')
				]
			]
		}
		var json = { age: 19, pass: '123', pass_2: '123' };
		var errors = v.validate(json, { validations, validateAll: false });

		assert.ok(errors === null);
	});
});
