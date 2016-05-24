( function ( root, factory ) {

	if ( typeof define === 'function' && define.amd ) {
		define( [ 'backbone', 'underscore', 'io' ], function ( Backbone, _, io ) {
			return ( root.Highway = factory( root, Backbone, _, io ) );
		} );
	} else if ( typeof exports !== 'undefined' ) {
		var Backbone = require( 'backbone' );
		var _ = require( 'underscore' );
		var io = require( 'socket.io-client' );
		module.exports = factory( root, Backbone, _, io );
	} else {
		root.Highway = factory( root, root.Backbone, root._, root.io );
	}

}( this, function ( root, Backbone, _, io ) {
	'use strict';

	var previousHighway = root.Highway;

	var Highway = Backbone.Highway = {};

	Highway.VERSION = '1.0.0';

	// Get the Deferred creator for later use
	Highway.Deferred = Backbone.$.Deferred;

	// Borrow the Backbone `extend` method so we can use it as needed
	Highway.extend = Backbone.Model.extend;

	var errorProps = [ 'description', 'fileName', 'lineNumber', 'name', 'message', 'number' ];

	Highway.Error = Marionette.extend.call( Error, {
		urlRoot: 'http://github.com/krewenki/backbone.highway/wiki/v' + Highway.VERSION + '/',

		constructor: function ( message, options ) {
			if ( _.isObject( message ) ) {
				options = message;
				message = options.message;
			} else if ( !options ) {
				options = {};
			}

			var error = Error.call( this, message );
			_.extend( this, _.pick( error, errorProps ), _.pick( options, errorProps ) );

			this.captureStackTrace();

			if ( options.url ) {
				this.url = this.urlRoot + options.url;
			}
		},

		captureStackTrace: function () {
			if ( Error.captureStackTrace ) {
				Error.captureStackTrace( this, Marionette.Error );
			}
		},

		toString: function () {
			return this.name + ': ' + this.message + ( this.url ? ' See: ' + this.url : '' );
		}
	} );

	Highway.Error.extend = Highway.extend;


	Highway.Collection = Backbone.Collection.extend( {} );
	Highway.Model = Backbone.Model.extend( {} );

	return Highway;
} ) );
