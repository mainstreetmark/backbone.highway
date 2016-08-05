var sinon = require('sinon');
var expect = require('expect.js');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.should();
chai.use(chaiAsPromised);


global.Backbone = require('backbone');
global._ = require('underscore');
global.io = require('socket.io-client');
if (typeof localStorage === "undefined" || localStorage === null) {
	var LocalStorage = require('node-localstorage').LocalStorage;
	localStorage = new LocalStorage('./scratch');
}

require('../lib/backbone.highway.js');



before(function (done) {
	this.timeout(20000);
	var express = require('express');
	var app = express();

	var port = 8081;
	var server = app.listen(port, function () {

	});

	var ioserver = require('socket.io')
		.listen(server);

	var config = {
		uri: '127.0.0.1',
		database: 'highway',
		auth: [{
			defaultUser: '56fea5cc54d49c036c802e53',
			strategy: 'local',
			sessionLength: 60 * 60 * 24 * 365,
		}]
	};
	config.http = app;
	config.io = ioserver;
	var Highway = require('highway.server');
	var hw = new Highway(config).then(function (obj) {
		obj.db.collection('users').remove({});
		done();
	}, function (err) {
		console.log('error: ', err);
	});

});


describe('Backbone.Highway.Model', function () {
	it('should exist', function () {
		return expect(Backbone.Highway.Model)
			.to.be.ok;
	});

	it('should extend', function () {
		var Model = Backbone.Highway.Model.extend({

		});
		return expect(Model)
			.to.be.ok;
	});
	it('should extend construct', function () {
		var Model = Backbone.Highway.Model.extend({

		});
		return expect(new Model())
			.to.be.ok;
	});

	describe('#clear', function () {
		var Model = Backbone.Highway.Model.extend({

		});
		var m = new Model({
			"_id": "123",
			"name": "Dave"
		});
		it('should exist', function () {
			expect(m.clear).to.be.ok;
		});
		it('should be a method', function () {
			expect(m.clear).to.be.a('function');
		});
		it('should remove attributes from a model', function () {
			m = new Model({
				"_id": "123",
				"name": "Dave"
			});
			m.clear();
			expect(m.get('name')).to.be.a('undefined');
		});
		it('should not remove the _id attribute from a model', function () {
			m = new Model({
				"_id": "123",
				"name": "Dave"
			});
			m.clear();
			expect(m.get('_id')).to.be.a('string');
		});
		//it('should trigger a change event with the unset option');
	});

	describe('#save', function () {
		var collection;
		var model = {};
		beforeEach(function () {
			var Model = Backbone.Highway.Model.extend({

			});

			model = new Model({
				"number": 123,
				"string": "The quick brown fox jumped over the lazy dog",
				"array": [1, 2, 3, "one", "two", "three", {
					"prop": true
				}],
				"bool": true,
				"object": {
					"level": "one",
					"nested": {
						"level": "two",
						"nullprop": null
					}
				}
			});
		});
		it('should exist', function () {
			expect(model.save)
				.to.be.ok;
		});
		it('should be a method', function () {
			expect(model.save)
				.to.be.a('function');
		});
		it('should generate a console warning', function () {
			sinon.spy(console, 'warn');

			model.save({
				"name": "Dave"
			});

			expect(console.warn.calledOnce)
				.to.be.ok;

			console.warn.restore();
		});
		it('should call #set with the arguments it was provided', function () {
			sinon.spy(model, 'set');

			model.save({
				"name": "Dave"
			});

			expect(model.set.calledOnce)
				.to.be.ok;

			model.set.restore();
		});
		it('should call #set and apply the arguments properly', function () {
			model.save({
				"name": "Dave"
			});

			expect(model.get('name'))
				.to.be('Dave');
		});
	});

	describe('#set', function () {
		var collection;
		var model = {};
		beforeEach(function () {
			var Model = Backbone.Highway.Model.extend({

			});

			model = new Model({
				"number": 123,
				"string": "The quick brown fox jumped over the lazy dog",
				"array": [1, 2, 3, "one", "two", "three", {
					"prop": true
				}],
				"bool": true,
				"object": {
					"level": "one",
					"nested": {
						"level": "two",
						"nullprop": null
					}
				}
			});
		});
		it('should exist', function () {
			expect(model.set)
				.to.be.ok;
		});
		it('should be a method', function () {
			expect(model.set)
				.to.be.a('function');
		});
		it('should return when no arguments are passed', function () {
			expect(model.set())
				.to.be.a('undefined');
		});
		it('should call _setRecursive when passed a nested string as key (i.e. obj1.obj2.key)', function () {
			sinon.spy(model, '_setRecursive');

			model.set('my.name.is', "Dave");

			expect(model._setRecursive.called)
				.to.be.ok;

			model._setRecursive.restore();
		});
		it('should create objects if they dont exist', function () {
			localStorage.setItem('backfill_users', '[{ "name": "fart"}]');
			expect(model.get('darth.vader'))
				.to.be.a('undefined');
			model.set('darth.vader', 'Lukes Dad');
			expect(model.get('darth.vader'))
				.to.be('Lukes Dad')
		});
		it('should bypass _setRecursive if the property isnt an object', function () {
			sinon.spy(model, '_setRecursive');

			model.set('darth', 'Lukes Dad');
			expect(model._setRecursive.called)
				.to.not.be.ok;
			model._setRecursive.restore();
		});
		it('should call Backbone.Model.prototype.set() after generating the object to save', function () {
			sinon.spy(Backbone.Model.prototype, 'set');

			model.set('darth', 'Lukes Dad');
			expect(Backbone.Model.prototype.set.called)
				.to.be.ok;
			Backbone.Model.prototype.set.restore();
		});

	});

	describe('#get', function () {
		var collection;
		var model = {};
		beforeEach(function () {
			var Model = Backbone.Highway.Model.extend({

			});

			model = new Model({
				"number": 123,
				"string": "The quick brown fox jumped over the lazy dog",
				"array": [1, 2, 3, "one", "two", "three", {
					"prop": true
				}],
				"bool": true,
				"object": {
					"level": "one",
					"nested": {
						"level": "two",
						"nullprop": null
					}
				}
			});
		});

		it('should exist', function () {
			return expect(model.get)
				.to.be.ok;
		});
		it('should be a method', function () {
			return expect(model.get)
				.to.be.a('function');
		});
		it('should return undefined with no arguments', function () {
			return expect(model.get())
				.to.be.a('undefined');
		});
		it('should return a number when prop is a number', function () {
			return expect(model.get('number'))
				.to.be.a('number');
		});
		it('should return a string when prop is a string', function () {
			return expect(model.get('string'))
				.to.be.a('string');
		});
		it('should return a array when prop is an array', function () {
			return expect(model.get('array'))
				.to.be.a('array');
		});
		it('should return a object when prop is an object', function () {
			return expect(model.get('object'))
				.to.be.a('object');
		});
		it('should return a bool when prop is a bool', function () {
			return expect(model.get('bool')).to.be.a('boolean');
		});
		it('should return a prop when prop is nested in an object', function () {
			return expect(model.get('object.level'))
				.to.be('one');
		});
		it('should return a prop when prop is nested in objects', function () {
			return expect(model.get('object.nested.level'))
				.to.be('two');
		});
		it('should return a prop when prop is nested in objects', function () {
			return expect(model.get('object.nested.nullprop'))
				.to.be(null);
		});
		it('should return undefined when prop is nested but undefined', function () {
			return expect(model.get('object.nested.notaprop'))
				.to.be(undefined);
		});
		it('should return a new array instead of a reference to an array', function () {
			return expect(model.get('array') !== model.attributes.array)
				.to.be(true);
		});
	});

	describe('#destroy', function () {
		var collection;
		var model = {};
		beforeEach(function () {
			var Model = Backbone.Highway.Model.extend({

			});

			model = new Model({
				"number": 123,
				"string": "The quick brown fox jumped over the lazy dog",
				"array": [1, 2, 3, "one", "two", "three", {
					"prop": true
				}],
				"bool": true,
				"object": {
					"level": "one",
					"nested": {
						"level": "two",
						"nullprop": null
					}
				}
			});
		});
		it('should exist', function () {
			return expect(model.destroy)
				.to.be.ok;
		});
		it('should be a method', function () {
			return expect(model.destroy)
				.to.be.a('function');
		});
		it('should call collection.remove if model belongs to a collection', function () {

			var c = Backbone.Collection.extend({});
			var collection = new c();
			collection.add(model);

			sinon.spy(collection, 'remove');
			model.destroy();
			var o = expect(collection.remove.calledOnce).to.be.true;

			collection.remove.restore();
		});
		it('should fall back to Backbone.Model.prototype.destroy if it doesnt belong to a collection', function () {
			sinon.spy(model, 'destroy');

			model.destroy();
			var o = expect(model.destroy.calledOnce).to.be.true;

			model.destroy.restore();
		});
	});

	describe('#sync', function () {
		var collection;
		var model = {};
		beforeEach(function () {
			var Model = Backbone.Highway.Model.extend({

			});

			model = new Model({
				"number": 123,
				"string": "The quick brown fox jumped over the lazy dog",
				"array": [1, 2, 3, "one", "two", "three", {
					"prop": true
				}],
				"bool": true,
				"object": {
					"level": "one",
					"nested": {
						"level": "two",
						"nullprop": null
					}
				}
			});
		});
		it('should exist', function () {
			return expect(model.sync)
				.to.be.ok;
		});
		it('should be a method', function () {
			return expect(model.sync)
				.to.be.a('function');
		});
		it('should return true', function () {
			return expect(model.sync()).to.be.true;
		});
		it('should trigger a collection sync event, if a collection exists', function () {
			var c = Backbone.Collection.extend({});
			var collection = new c();
			collection.add(model);
			var sync = false;
			collection.on('sync', function () {
				sync = true;
			});
			model.sync();

			return expect(sync).to.be.true;


		});
	});
});


describe('Backbone.Highway.Model in a collection', function () {
	describe('#set', function () {
		var Collection, col, Model, m;
		Model = Backbone.Highway.Model.extend({
			defaults: {
				mickey: 'mouse'
			}
		});
		Collection = Backbone.Highway.Collection.extend({
			url: 'http://127.0.0.1:8081/highway/users',
			Model: Model
		})

		beforeEach(function (done) {
			this.timeout(5000);
			c = new Collection();
			setTimeout(function () {
				c.add({
					steve: 'irwin'
				});
				done();
			}, 4000)
		});
		it('should call io.emit if it belongs to a collection', function () {

			m = c.at(0);
			sinon.spy(c.io, 'emit');
			m.set({
				crap: true
			});

			expect(c.io.emit.calledOnce).to.be.true;
			c.io.emit.restore();
		});
		it('should call io.emit with an update argument', function () {

			m = c.at(0);
			sinon.spy(c.io, 'emit');
			m.set({
				crap2: true
			});

			expect(c.io.emit.calledWith('update')).to.be.true;
			c.io.emit.restore();
		});
	})
});

describe('Backbone.Highway.Collection', function () {


	it('should exist', function () {
		return expect(Backbone.Highway.Collection)
			.to.be.ok;
	});

	it('should extend', function () {
		var Collection = Backbone.Highway.Collection.extend({
			url: 'http://127.0.0.1:8081/highway/users'
		});
		return expect(Collection)
			.to.be.ok;
	});

	it('should extend construct', function () {
		var Collection = Backbone.Highway.Collection.extend({
			url: 'http://127.0.0.1:8081/highway/users',
			io: io
		});
		return expect(new Collection())
			.to.be.ok;
	});

	// throw err
	it('should throw an error if an invalid url is provided', function () {
		var Collection = Backbone.Highway.Collection.extend({
			url: true
		});
		try {
			var model = new Collection();
		} catch (err) {
			expect(err.message)
				.to.equal('url parameter required');
		}
	});

	it('should accept a function for url', function () {
		var Collection = Backbone.Highway.Collection.extend({
			url: function () {
				return 'http://fake.com?' + Date.now();
			}
		});
		var c = new Collection();
		return expect(c.url).to.be.ok;
	});


	describe('SyncCollection', function () {

		var collection;

		it('should enable autoSync by default', function () {
			var Model = Backbone.Highway.Collection.extend({
				url: 'http://127.0.0.1:8081/highway/users'
			});

			var model = new Model();

			return expect(model.autoSync)
				.to.be.ok;
		});

		describe('#_initialSync', function () {
			describe('maximum', function () {
				var collection, c;
				beforeEach(function () {
					collection = Backbone.Highway.Collection.extend({
						url: 'http://127.0.0.1:8081/highway/users',
						maximum: {
							limit: 2
						}
					});
					c = new collection();
				});
				it('should be included in this.constraints.maximum', function () {
					expect(c.constraints.maximum).to.be.ok;
				});
				it('should have obey maximum length', function (done) {
					this.timeout(4000);
					setTimeout(function () {
						expect(c.length).to.be.below(3);
						done();
					}, 3000);
				});
				it('should not emit a destroy event when autopruning', function () {
					sinon.spy(c.io, 'emit');
					for (var i = 0; i < 20; i++) {
						c.add({
							name: 'Bill'
						});
					}
					expect(c.io.emit.calledWith('remove')).to.be.false;
					expect(c.length).to.be.below(3);
					c.io.emit.restore();

				});
			});
		});

		describe('#_search', function () {
			var collection, c;
			beforeEach(function () {
				collection = Backbone.Highway.Collection.extend({
					url: 'http://127.0.0.1:8081/highway/users'
				});
				c = new collection();
			});
			it('should exist', function () {
				return expect(c._search).to.be.ok;
			});
			it('should be a method', function () {
				expect(c._search).to.be.a('function');
			});
			it('should return a promise', function () {
				expect(c._search()).to.be.a('object');
			});
			it('should resolve if collection isnt partial', function (done) {
				c._search().should.eventually.notify(done);
			});
			it('should emit a search event if the collection is partial', function () {

				collection = Backbone.Highway.Collection.extend({
					url: 'http://127.0.0.1:8081/highway/users',
					minimum: {
						limit: 1
					}
				});
				c = new collection();

				sinon.spy(c.io, 'emit');

				c._search({
					search: {
						name: 'Dave'
					}
				});
				var o = expect(c.io.emit.calledWith('search')).to.be.true;
				c.io.emit.restore();
			});
			it('should reject if search criteria isnt valid', function (done) {
				collection = Backbone.Highway.Collection.extend({
					url: 'http://127.0.0.1:8081/highway/users',
					minimum: {
						limit: 1
					}
				});
				c = new collection();

				var promise = c._search({
					fluffer: 'nutter'
				});
				promise.should.eventually.be.rejected.notify(done);
			});
		});

		describe('#_where', function () {
			var collection, c;
			beforeEach(function () {
				collection = Backbone.Highway.Collection.extend({
					url: 'http://127.0.0.1:8081/highway/users',
					minimum: {
						limit: 1
					}
				});
				c = new collection();
			});
			it('should exist', function () {
				return expect(c._where).to.be.ok;
			});
			it('should be a method', function () {
				expect(c._where).to.be.a('function');
			});
			it('should return a promise', function () {
				expect(c._where()).to.be.a('object');
			});
			it('should call _search', function () {
				sinon.spy(c, '_search');

				c._where();
				var o = expect(c._search.calledOnce).to.be.true;

				c._search.restore();
			});
			it('should resolve after _search()', function (done) {
				this.timeout(10000);
				var o = c._where({});
				o.should.eventually.notify(done);
			});
			it('should append fetched results to collection after _search', function (done) {
				this.timeout(10000);
				var len = c.length;
				c._where({}).then(function () {
					var o = expect(c.length > len).to.be.true;
					done();
				});
			});
		});

		describe('#_filter', function () {

			var Collection = Backbone.Highway.Collection.extend({
				url: 'http://127.0.0.1:8081/highway/users',
			});
			var PartialCollection = Backbone.Highway.Collection.extend({
				url: 'http://127.0.0.1:8081/highway/users',
				minimum: {
					limit: 5
				}
			});

			var collection = new Collection();
			var partialcollection = new PartialCollection();

			it('should call _search when it is a partial collection', function () {
				sinon.spy(partialcollection, '_search');

				partialcollection._filter({
					id: '1'
				});

				expect(partialcollection._search.calledOnce)
					.to.be.ok;

				partialcollection._search.restore();
			});
			it('should not call _search when it is not a partial collection', function () {
				sinon.spy(collection, '_search');

				collection._filter({
					id: '1'
				});

				expect(collection._search.calledOnce)
					.to.not.be.ok;

				collection._search.restore();
			});

			it('should return a promise', function () {
				var ret = partialcollection._filter({
					id: '1'
				});
				expect(ret)
					.to.be.a('object');
			});

			if ('should append all records to the collection after _search is called');

		});

		describe('#_findWhere', function () {
			var c, collection;
			beforeEach(function () {
				collection = Backbone.Highway.Collection.extend({
					url: 'http://127.0.0.1:8081/highway/users',
				});
				c = new collection();

			});
			it('should exist', function () {
				return expect(c._findWhere).to.be.ok;
			});
			it('should be a method', function () {
				expect(c._findWhere).to.be.a('function');
			});
			it('should return a promise', function () {
				expect(c._findWhere()).to.be.a('object');
			});
			it('should call _where', function () {
				sinon.spy(c, '_where');
				var where = c._findWhere({});
				expect(c._where.calledOnce).to.be.true;

				c._where.restore();
			});
		});

		describe('#create', function () {

			var Collection = Backbone.Highway.Collection.extend({
				url: 'http://127.0.0.1:8081/highway/users'
			});

			var collection = new Collection();


			// ignore wait
			it('should ignore options.wait', function () {
				sinon.spy(collection, '_log');
				collection.create({
					firstname: 'David'
				}, {
					wait: function () {}
				});

				expect(collection._log.calledOnce)
					.to.be.ok;

				collection._log.restore();
			});

			// call SyncCollection.add
			it('should call SyncCollection.add once', function () {
				sinon.spy(collection, 'add');

				collection.create({
					firstname: 'David'
				});

				expect(collection.add.calledOnce)
					.to.be.true;

				collection.add.restore();
			});

			// return false for no model
			it('should return false when no model is provided', function () {
				var expectFalse = collection.create();
				expect(expectFalse)
					.to.be.false;
			});

			it('should eventually have an _id set', function (done) {
				var model = collection.create({
					'name': 'Steve'
				});
				setTimeout(function () {
					expect(model.get('_id')).to.be.ok;
					done();
				}, 1000);
			});

			it('should eventually increase collection.length by 1', function (done) {
				var original_length = collection.length;
				var model = collection.create({
					'name': 'Steve'
				});
				setTimeout(function () {
					expect(collection.length).to.equal(original_length + 1);
					done();
				}, 1000);
			});

		});

		describe('#_create', function () {
			var collection, Collection;
			beforeEach(function () {
				Collection = Backbone.Highway.Collection.extend({
					url: 'http://127.0.0.1:8081/highway/users'
				});

				collection = new Collection();

			});


			// ignore wait
			it('should ignore options.wait', function () {
				sinon.spy(collection, '_log');
				collection._create({
					firstname: 'David'
				}, {
					wait: function () {}
				});

				expect(collection._log.calledOnce)
					.to.be.ok;

				collection._log.restore();
			});

			// call SyncCollection.add
			it('should call Backbone.Collection.prototype.add', function () {
				sinon.spy(collection, 'add');

				collection._create({
					firstname: 'David'
				});

				expect(collection.add.calledOnce)
					.to.be.true;

				collection.add.restore();
			});

			// return false for no model
			it('should return a rejected promise when no model is provided', function (done) {
				var expectFalse = collection._create();
				expectFalse.should.eventually.be.rejected.notify(done);
			});



			it('should increment the length of the collection by one', function (done) {
				var original_length = collection.length;
				collection._create({
					firstname: 'David'
				}).then(function () {
					expect(collection.length).to.equal(original_length + 1);
					done();
				}, function (err) {
					console.log(err);
				});
			});

		});

		describe('#remove', function () {

			var Collection, collection;
			beforeEach(function () {
				Collection = Backbone.Highway.Collection.extend({
					url: 'http://127.0.0.1:8081/highway/users'
				});

				collection = new Collection();
			});

			it('should exist', function () {
				expect(collection.remove).to.be.ok;
			});
			it('should be a method', function () {
				expect(collection.remove).to.be.a('function');
			});
			it('should call Backbone.Collection.prototype.remove', function () {
				sinon.spy(Backbone.Collection.prototype, 'remove');
				collection.remove('dave');
				expect(Backbone.Collection.prototype.remove.calledOnce).to.be.true;
				Backbone.Collection.prototype.remove.restore();
			});
			it('should emit a "destroy" socket event', function () {
				sinon.spy(collection.io, 'emit');
				collection.remove('dave');
				expect(collection.io.emit.calledOnce).to.be.true;
				collection.io.emit.restore();
			});
			it('should accept strings as models', function () {
				var r = collection.remove('scott');
				expect(r).to.not.be.undefined;
			});
			it('should accept numbers as models', function () {
				var r = collection.remove(55);
				expect(r).to.not.be.undefined;
			});
			it('should accept objects as models', function () {
				var r = collection.remove(collection.at(1));
				expect(r).to.not.be.undefined;
			});
			it('should not accept bools as models', function () {
				var r = collection.remove(true);
				expect(r).to.be.undefined;
			});


			// call silently
			it('should set _suppressEvent to true when set silently', function () {
				collection.remove({
					id: '1'
				}, {
					silent: true
				});
				// TODO: investigate
				//collection.firebase.flush();
				expect(collection._suppressEvent)
					.to.be.ok;
			});

		});



		describe('#reset', function () {

			var Collection = Backbone.Highway.Collection.extend({
				url: 'http://127.0.0.1:8081/highway/users'
			});

			var collection = new Collection();

			// call remove
			it('should call SyncCollection.remove', function () {
				sinon.spy(collection, 'remove');

				collection.reset({
					id: '1'
				});

				expect(collection.remove.calledOnce)
					.to.be.ok;

				collection.remove.restore();
			});

			// call add
			it('should call SyncCollection.add', function () {
				sinon.spy(collection, 'add');

				collection.reset({
					id: '1'
				});

				expect(collection.add.calledOnce)
					.to.be.ok;

				collection.add.restore();
			});

			// don't trigger reset when silent
			it('should not trigger the resete event when silent is passed', function () {
				var spy = sinon.spy();

				collection.on('reset', spy);

				collection.reset({
					id: '1'
				}, {
					silent: true
				});

				expect(spy.calledOnce)
					.to.be.false;
			});

			it('should trigger the resete event when silent is passed', function () {
				var spy = sinon.spy();

				collection.on('reset', spy);

				collection.reset({
					id: '1'
				});

				expect(spy.calledOnce)
					.to.be.true;
			});

		});


		describe('#_log', function () {

			var Collection = Backbone.Highway.Collection.extend({
				url: 'http://127.0.0.1:8081/highway/users'
			});

			var collection = new Collection();

			beforeEach(function () {
				sinon.spy(console, 'log');
			});

			afterEach(function () {
				console.log.restore();
			});

			it('should call console.log', function () {
				collection._log('logging');
				expect(console.log.calledOnce)
					.to.be.true;
			});

		});



		describe('#_childChanged', function () {

			var collection;
			beforeEach(function (done) {
				this.timeout(4000);
				var Collection = Backbone.Highway.Collection.extend({
					url: 'http://127.0.0.1:8081/highway/users',
					idAttribute: Backbone.Model.prototype.idAttribute,
					autoSync: true
				});

				collection = new Collection();

				collection.add({
					id: '1',
					name: 'David',
					age: 26
				});

				setTimeout(function () {
					done();
				}, 3000);

			});

			it('should unset local property from remote deletion', function () {

				var mockSnap = {
					id: '1',
					name: 'David'
						// age has been removed
				};

				collection._childChanged(mockSnap);

				var changedModel = collection.models[0];

				expect(changedModel.age)
					.to.be.undefined;

			});

			/*	it('should update local model from remote update', function () {

					var mockSnap = {
						id: '1',
						name: 'David',
						age: 26,
						favDino: 'trex'
							// trex has been added
					};

					collection._childChanged(mockSnap);

					var changedModel = collection.get('1');

					expect(changedModel.get('favDino'))
						.to.equal('trex');

				}); */

			it('should add when item cannot be found', function () {
				sinon.spy(collection, '_childAdded');

				var mockSnap = {
					id: '4',
					name: 'Cash',
					age: 2
				};

				collection._childChanged(mockSnap);
				expect(collection._childAdded.calledOnce)
					.to.be.true;

				collection._childAdded.restore();
			});
		});

		describe('#_childRemoved', function () {

			var collection;
			beforeEach(function () {
				var Collection = Backbone.Highway.Collection.extend({
					url: 'http://127.0.0.1:8081/highway/users',
					autoSync: true
				});

				collection = new Collection();

				collection.models = [
					new Backbone.Model({
						id: '1',
						name: 'David',
						age: 26
					})
				];

			});

			it('should call Backbone.Collection.remove', function () {
				sinon.spy(Backbone.Collection.prototype, 'remove');

				var mockSnap = {
					id: '1',
					name: 'David',
					age: 26
				};

				collection._childRemoved(mockSnap);

				expect(Backbone.Collection.prototype.remove.calledOnce)
					.to.be.ok;
				Backbone.Collection.prototype.remove.restore();
			});

			// silent remove
			it('should call Backbone.Collection.remove silently', function () {
				sinon.spy(Backbone.Collection.prototype, 'remove');

				var mockSnap = {
					id: '1',
					name: 'David',
					age: 26
				};

				collection._suppressEvent = true;
				collection._childRemoved(mockSnap);

				expect(Backbone.Collection.prototype.remove.calledWith({
					silent: true
				}));
				Backbone.Collection.prototype.remove.restore();
			});

		});

		describe('#_childAdded', function () {

			var collection;
			beforeEach(function () {
				var Collection = Backbone.Highway.Collection.extend({
					url: 'http://127.0.0.1:8081/highway/users',
					autoSync: true
				});

				collection = new Collection();

				collection.models = [
					new Backbone.Model({
						id: '1',
						name: 'David',
						age: 26
					})
				];

			});

			it('should call Backbone.Collection.add', function () {
				sinon.spy(Backbone.Collection.prototype, 'add');

				var mockSnap = {
					id: '1',
					name: 'David',
					age: 26
				};

				collection._childAdded(mockSnap);

				expect(Backbone.Collection.prototype.add.calledOnce)
					.to.be.ok;
				Backbone.Collection.prototype.add.restore();
			});

			// silent add
			it('should call Backbone.Collection.add silently', function () {
				sinon.spy(Backbone.Collection.prototype, 'add');
				var mockSnap = {
					id: '1',
					name: 'David',
					age: 26
				};

				collection._suppressEvent = true;
				collection._childAdded(mockSnap);

				expect(Backbone.Collection.prototype.add.calledWith({
					silent: true
				}));
				Backbone.Collection.prototype.add.restore();
			});

		});

		describe('#_updateModel', function () {

			var collection;
			var model;
			beforeEach(function () {

				var Collection = Backbone.Highway.Collection.extend({
					url: 'http://127.0.0.1:8081/highway/users'
				});

				collection = new Collection([
					new Backbone.Model({
						id: '1',
						name: 'David',
						age: 26
					})
				]);

				model = new Backbone.Model({
					id: "1",
					name: 'Kato',
					age: 26
				});

			});

			it('should exist', function () {
				expect(collection._updateModel).to.be.ok;
			});
			it('should be a method', function () {
				expect(collection._updateModel).to.be.a('function');
			});
			it('should return if no model is provided', function () {
				expect(collection._updateModel()).to.be.undefined;
			});
			it('should build a "save" object from changedAttributes()', function () {
				sinon.spy(model, 'changedAttributes');
				collection._updateModel(model);
				expect(model.changedAttributes.calledOnce).to.be.true;
				model.changedAttributes.restore();
			});
			it('should not emit an update event if model._id is not present', function () {
				sinon.spy(collection.io, 'emit');
				collection._updateModel(model);
				expect(collection.io.emit.calledOnce).to.be.false;
				collection.io.emit.restore();
			})
			it('should emit an update event if model._id is present', function () {
				sinon.spy(collection.io, 'emit');
				model.set("_id", "test");
				collection._updateModel(model);
				expect(collection.io.emit.calledOnce).to.be.true;
				collection.io.emit.restore();
			});


			it('should not update if the model\'s _remoteChanging property is true', function () {
				model._remoteChanging = true;
				collection._updateModel(model);
				var collectionModel = collection.models[0];
				return expect(collectionModel.get('name'))
					.to.equal('David');
			});
		});




		describe('#_addModel', function () {

		});

		describe('#_removeModel', function () {
			var c, collection;
			beforeEach(function () {
				collection = Backbone.Highway.Collection.extend({
					url: 'http://127.0.0.1:8081/highway/users',
				});
				c = new collection();
			});
			it('should exist', function () {
				expect(c._removeModel).to.be.ok;
			});
			it('should be a method', function () {
				expect(c._removeModel).to.be.a('function');
			});
			it('should return if no model is provided', function () {
				expect(c._removeModel()).to.be.undefined;
			});
			it('should emit a destroy event', function () {
				sinon.spy(c.io, 'emit');
				c._removeModel({});

				expect(c.io.emit.calledOnce).to.be.true;
				c.io.emit.restore();
			});
		});


		describe('#add', function () {
			var collection;
			var model, models;
			beforeEach(function () {

				var Collection = Backbone.Highway.Collection.extend({
					url: 'http://127.0.0.1:8081/highway/users'
				});

				models = [
					new Backbone.Model({
						id: '1',
						name: 'David',
						age: 26
					})
				];

				collection = new Collection(models);


				model = new Backbone.Model({
					id: "2",
					name: 'Kato',
					age: 26
				});

			});
			it('should call Backbone.Collection.prototype.add', function () {
				sinon.spy(Backbone.Collection.prototype, 'create');

				collection.add(model);

				expect(Backbone.Collection.prototype.create.calledOnce)
					.to.be.ok;

				Backbone.Collection.prototype.create.restore();
			});
			it('should increase the length of the collection by 1', function () {
				collection.add(model);
				expect(collection.length)
					.to.equal(2);
			});
			it('should trigger the add event', function () {
				sinon.spy(collection, '_addModel');

				collection.add(model);
				expect(collection._addModel.calledOnce).to.be.true;

				collection._addModel.restore();
			});
		});

	});

});
