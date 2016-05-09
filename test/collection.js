require( 'jsdom-global' )();
var sinon = require( 'sinon' );

var expect = require( 'expect.js' );
window.Backbone = require( 'backbone' );
window._ = require( 'underscore' );
var io = window.io = require( 'socket.io-client' );

require( '../lib/backbone.highway.js' );

describe( 'Backbone.Highway.Collection', function () {

	it( 'should exist', function () {
		return expect( window.Backbone.Highway.Collection )
			.to.be.ok;
	} );

	it( 'should extend', function () {
		var Collection = window.Backbone.Highway.Collection.extend( {
			url: 'Mock://'
		} );
		return expect( Collection )
			.to.be.ok;
	} );

	it( 'should extend construct', function () {
		var Collection = window.Backbone.Highway.Collection.extend( {
			url: 'Mock://',
			io: window.io
		} );
		return expect( new Collection() )
			.to.be.ok;
	} );

	// throw err
	it( 'should throw an error if an invalid url is provided', function () {
		var Collection = window.Backbone.Highway.Collection.extend( {
			url: true
		} );
		try {
			var model = new Collection();
		} catch ( err ) {
			expect( err.message )
				.to.equal( 'url parameter required' );
		}
	} );



	describe( '#_parseModels()', function () {
		var Collection = window.Backbone.Highway.Collection.extend( {
			url: 'Mock://'
		} );

		var collection = new Collection();

		/*it( 'should be a method', function () {
			return expect( collection )
				.to.have.property( '_parseModels' )
				.and.be.a( 'function' );
		} );*/

		it( 'should return an empty array when called without parameters', function () {
			var result = collection._parseModels();
			return expect( result )
				.to.eql( [] );
		} );

	} );

	describe( 'SyncCollection', function () {

		var collection;

		it( 'should enable autoSync by default', function () {
			var Model = window.Backbone.Highway.Collection.extend( {
				url: 'Mock://'
			} );

			var model = new Model();

			return expect( model.autoSync )
				.to.be.ok;
		} );



		describe( '#create', function () {

			var Collection = window.Backbone.Highway.Collection.extend( {
				url: 'Mock://'
			} );

			var collection = new Collection();


			// ignore wait
			it( 'should ignore options.wait', function () {
				sinon.spy( collection, '_log' );
				collection.create( {
					firstname: 'David'
				}, {
					wait: function () {}
				} );
				//collection.firebase.flush();

				expect( collection._log.calledOnce )
					.to.be.ok;

				collection._log.restore();
			} );

			// call SyncCollection.add
			it( 'should call SyncCollection.add', function () {
				sinon.spy( collection, 'add' );

				collection.create( {
					firstname: 'David'
				} );

				expect( collection.add.calledOnce )
					.to.be.true;

				collection.add.restore();
			} );

			// return false for no model
			it( 'should return false when no model is provided', function () {
				var expectFalse = collection.create();
				expect( expectFalse )
					.to.be.false;
			} );

		} );

		describe( '#remove', function () {


			var Collection = window.Backbone.Highway.Collection.extend( {
				url: 'Mock://'
			} );

			var collection = new Collection();

			// call silently
			it( 'should set _suppressEvent to true when set silently', function () {
				collection.remove( {
					id: '1'
				}, {
					silent: true
				} );
				// TODO: investigate
				//collection.firebase.flush();
				expect( collection._suppressEvent )
					.to.be.ok;
			} );

		} );



		describe( '#reset', function () {

			var Collection = window.Backbone.Highway.Collection.extend( {
				url: 'Mock://'
			} );

			var collection = new Collection();

			// call remove
			it( 'should call SyncCollection.remove', function () {
				sinon.spy( collection, 'remove' );

				collection.reset( {
					id: '1'
				} );

				expect( collection.remove.calledOnce )
					.to.be.ok;

				collection.remove.restore();
			} );

			// call add
			it( 'should call SyncCollection.add', function () {
				sinon.spy( collection, 'add' );

				collection.reset( {
					id: '1'
				} );

				expect( collection.add.calledOnce )
					.to.be.ok;

				collection.add.restore();
			} );

			// don't trigger reset when silent
			it( 'should not trigger the resete event when silent is passed', function () {
				var spy = sinon.spy();

				collection.on( 'reset', spy );

				collection.reset( {
					id: '1'
				}, {
					silent: true
				} );

				expect( spy.calledOnce )
					.to.be.false;
			} );

			it( 'should trigger the resete event when silent is passed', function () {
				var spy = sinon.spy();

				collection.on( 'reset', spy );

				collection.reset( {
					id: '1'
				} );

				expect( spy.calledOnce )
					.to.be.true;
			} );

		} );


		describe( '#_log', function () {

			var Collection = window.Backbone.Highway.Collection.extend( {
				url: 'Mock://'
			} );

			var collection = new Collection();

			beforeEach( function () {
				sinon.spy( console, 'log' );
			} );

			afterEach( function () {
				console.log.restore();
			} );

			it( 'should call console.log', function () {
				collection._log( 'logging' );
				expect( console.log.calledOnce )
					.to.be.true;
			} );

		} );

		describe( '#_preventSync', function () {
			var collection;
			var model = {};
			beforeEach( function () {
				var Collection = window.Backbone.Highway.Collection.extend( {
					url: 'Mock://',
					autoSync: true
				} );

				collection = new Collection();
			} )

			it( 'should change from false to true', function () {

				collection._preventSync( model, true );
				expect( model._remoteChanging )
					.to.be.ok;

			} );

			it( 'should change from true to false', function () {

				collection._preventSync( model, false );
				expect( model._remoteChanging )
					.to.be.false;

			} );

		} );

		describe( '#_childChanged', function () {

			var collection;
			beforeEach( function () {
				var Collection = window.Backbone.Highway.Collection.extend( {
					url: 'Mock://',
					idAttribute: window.Backbone.Model.prototype.idAttribute,
					autoSync: true
				} );

				collection = new Collection();

				collection.models = [
					new window.Backbone.Model( {
						id: '1',
						name: 'David',
						age: 26
					} )
				];

			} );

			it( 'should unset local property from remote deletion', function () {

				var mockSnap = {
					id: '1',
					name: 'David'
						// age has been removed
				};

				collection._childChanged( mockSnap );

				var changedModel = collection.models[ 0 ];

				expect( changedModel.age )
					.to.be.undefined;

			} );

			it( 'should update local model from remote update', function () {

				var mockSnap = {
					id: '1',
					name: 'David',
					age: 26,
					favDino: 'trex'
						// trex has been added
				};

				collection._childChanged( mockSnap );

				var changedModel = collection.models[ 0 ];

				expect( changedModel.get( 'favDino' ) )
					.to.be.ok;

			} );

			it( 'should add when item cannot be found', function () {
				sinon.spy( collection, '_childAdded' );

				var mockSnap = {
					id: '4',
					name: 'Cash',
					age: 2
				};

				collection._childChanged( mockSnap );
				expect( collection._childAdded.calledOnce )
					.to.be.true;

				collection._childAdded.restore();
			} );
		} );

		describe( '#_childRemoved', function () {

			var collection;
			beforeEach( function () {
				var Collection = window.Backbone.Highway.Collection.extend( {
					url: 'Mock://',
					autoSync: true
				} );

				collection = new Collection();

				collection.models = [
					new window.Backbone.Model( {
						id: '1',
						name: 'David',
						age: 26
					} )
				];

			} );

			it( 'should call Backbone.Collection.remove', function () {
				sinon.spy( window.Backbone.Collection.prototype, 'remove' );

				var mockSnap = {
					id: '1',
					name: 'David',
					age: 26
				};

				collection._childRemoved( mockSnap );

				expect( window.Backbone.Collection.prototype.remove.calledOnce )
					.to.be.ok;
				window.Backbone.Collection.prototype.remove.restore();
			} );

			// silent remove
			it( 'should call Backbone.Collection.remove silently', function () {
				sinon.spy( window.Backbone.Collection.prototype, 'remove' );

				var mockSnap = {
					id: '1',
					name: 'David',
					age: 26
				};

				collection._suppressEvent = true;
				collection._childRemoved( mockSnap );

				expect( window.Backbone.Collection.prototype.remove.calledWith( {
					silent: true
				} ) );
				window.Backbone.Collection.prototype.remove.restore();
			} );

		} );

		describe( '#_childAdded', function () {

			var collection;
			beforeEach( function () {
				var Collection = window.Backbone.Highway.Collection.extend( {
					url: 'Mock://',
					autoSync: true
				} );

				collection = new Collection();

				collection.models = [
					new window.Backbone.Model( {
						id: '1',
						name: 'David',
						age: 26
					} )
				];

			} );

			it( 'should call Backbone.Collection.add', function () {
				sinon.spy( window.Backbone.Collection.prototype, 'add' );

				var mockSnap = {
					id: '1',
					name: 'David',
					age: 26
				};

				collection._childAdded( mockSnap );

				expect( window.Backbone.Collection.prototype.add.calledOnce )
					.to.be.ok;
				window.Backbone.Collection.prototype.add.restore();
			} );

			// silent add
			it( 'should call Backbone.Collection.add silently', function () {
				sinon.spy( window.Backbone.Collection.prototype, 'add' );
				var mockSnap = {
					id: '1',
					name: 'David',
					age: 26
				};

				collection._suppressEvent = true;
				collection._childAdded( mockSnap );

				expect( window.Backbone.Collection.prototype.add.calledWith( {
					silent: true
				} ) );
				window.Backbone.Collection.prototype.add.restore();
			} );

		} );

		describe( '#_updateModel', function () {

			var collection;
			var model;
			beforeEach( function () {

				var Collection = window.Backbone.Highway.Collection.extend( {
					url: 'Mock://'
				} );

				collection = new Collection();

				collection.models = [
					new window.Backbone.Model( {
						id: '1',
						name: 'David',
						age: 26
					} )
				];

				model = new window.Backbone.Model( {
					id: "1",
					name: 'Kato',
					age: 26
				} );

			} );

			it( 'should not update if the model\'s _remoteChanging property is true', function () {

				model._remoteChanging = true;

				collection._updateModel( model );

				var collectionModel = collection.models[ 0 ];

				// The name property should still be equal to 'David'
				// because 'model' object had _remoteChanging set to true
				// which cancels the update. This is because _remoteChanging
				// indicates that the item is being updated through the
				// Firebase sync listeners
				return expect( collectionModel.get( 'name' ) )
					.to.equal( 'David' );

			} );

		} );





		describe( '#add', function () {
			var collection;
			var model;
			beforeEach( function () {

				var Collection = window.Backbone.Highway.Collection.extend( {
					url: 'Mock://'
				} );

				collection = new Collection();

				collection.models = [
					new window.Backbone.Model( {
						id: '1',
						name: 'David',
						age: 26
					} )
				];

				model = new window.Backbone.Model( {
					id: "1",
					name: 'Kato',
					age: 26
				} );

			} );
			it( 'should call Backbone.Collection.prototype.add', function () {
				sinon.spy( window.Backbone.Collection.prototype, 'add' );

				collection.add( {} );

				expect( window.Backbone.Collection.prototype.add.calledOnce )
					.to.be.ok;

				window.Backbone.Collection.prototype.add.restore();
			} );
		} );



	} );

} );
