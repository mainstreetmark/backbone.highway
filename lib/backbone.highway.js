(function (Backbone, _, io) {
	'use strict';


	if (typeof exports !== 'undefined') {
		Backbone = Backbone || require('backbone');
		_ = _ || require('underscore');
		io = io || require('socket.io-client');
	}

	Backbone.Highway = {};

	var HighwayModel = (function () {
		function HighwayModel() {

		}
		HighwayModel.prototype = {
			_log: function (msg) {
				console.log(msg);
			},
			_warn: function(msg){
				console.warn(msg);
			},
			_error: function(msg){
				console.error(msg);
			},
			destroy: function (options) {
				if (this.collection)
					return this.collection.remove(this, options);
				else
					return Backbone.Model.prototype.destroy.call(this, options);
			},
			sync: function () {
				// Sync doesn't do anything since everything is autosynced.
				// I'm overloading this method to avoid http errors.
				if (this.collection && this.collection.trigger)
					this.collection.trigger('sync');
				return true;
			},
			set: function (key, val, options) {
				if (_.isNull(key) || _.isUndefined(key))
					return;
				options = options ? _.clone(options) : {};
				var data = {},
					pieces, v, root, k, obj;
				if (_.isObject(key)) {
					options = val ? _.clone(val) : {};
					data = key;
				} else {
					data[key] = val;
				}

				//options = options || {};
				for (k in data) {
					if (k.indexOf('.') > -1) {
						obj = JSON.parse(JSON.stringify(this.get(k.split('.')
							.shift()) || {}));
						this._setRecursive(obj, k.split('.')
							.splice(1)
							.join('.'), data[k]);
						data[k.split('.')
							.shift()] = obj;
						delete data[k];
					}
				}
				if(this.collection && this.collection.io && this.get('_id') && !options.dontSave && !options.silent){
					data._id = this.get('_id');
					this.collection.io.emit('update', data );
				}
				return Backbone.Model.prototype.set.call(this, data, options);
			},
			_setRecursive: function (obj, prop, value) {
				if (typeof prop === "string")
					prop = prop.split(".");

				if (prop.length > 1) {
					var e = prop.shift();
					this._setRecursive(
						Object.prototype.toString.call(obj[e]) === "[object Object]" ? obj[e] : {},
						prop,
						value);
				} else
					obj[prop[0]] = value;
			},
			get: function (key) {
				var val, pieces, pieces_length;
				if (key && key.indexOf('.') > -1) {
					pieces = key.split('.');
					pieces_length = pieces.length;
					val = Backbone.Model.prototype.get.call(this, pieces[0]);
					if (val) {
						for (var i = 1; i < pieces_length; i++) {
							val = val[pieces[i]];
						}
					}
				} else {
					val = Backbone.Model.prototype.get.call(this, key);
				}
				return _.isArray(val) ? _.clone(val) : val;
			},
			save: function (data, options) {
				this._warn('Highway Models are automatically synced.  Use .set() instead of .save()');
				this.set.apply(this, arguments);
			},
			clear: function(options){
				var attrs = {};
	      for (var key in this.attributes) if(key != '_id') attrs[key] = void 0;
	      return this.set(attrs, _.extend({}, options, {unset: true}));
			}
		};

		return HighwayModel;
	})();

	var HighwayCollection = (function () {

		function HighwayCollection() {
			this.idAttribute = '_id';

			// Add handlers for remote events
			this.io.on('child_added', _.bind(this._childAdded, this));
			this.io.on('child_changed', _.bind(this._childChanged, this));
			this.io.on('child_removed', _.bind(this._childRemoved, this));
			this.io.on('all_records', _.bind(this._initialSync, this));

			_.defer(_.bind(function () {
				this.io.emit('init', this.minimum);
			}, this));

			// Handle changes in any local models.
			this.on('change', this._updateModel);
			// Listen for destroy event to remove models.
			this.listenTo(this, 'destroy', this._removeModel, this);

		}


		HighwayCollection.protoype = {

			_log: function (msg) {
				console.log(msg);
			},
			_warn: function(msg){
				console.warn(msg);
			},
			_error: function(msg){
				console.error(msg);
			},


			/**
			 * .create() a model but return a promise that resolves after
			 * the socket.io call has finished
			 *
			 * @method _create
			 * @param  {[type]} model   model attributes
			 * @param  {object} options regular backbone options
			 * @return {Promise} A promise that resolves to properties
			 */
			_create: function (model, options) {
				var self = this;
				options = options ? _.clone(options) : {};

				if (options.wait) {
					this._log('ignoring wait');
				}

				if (!model) {
					return Promise.reject(new Error('No model provided'));
				}

				return new Promise(function (success, failure) {
					self.io.emit('create', model, function (data) {
						var set = Backbone.Collection.prototype.add.call(self, [data], _.extend(options) );
						success(set[0]);
					});
				});
			},

			create: function (model, options) {
				options = options ? _.clone(options) : {};
				var wait = options.wait;
				model = this._prepareModel(model, options);
				if (!model) return false;
				if (wait)
					this._log('Ignoring wait');
				this.add(model, options);
				return model;
			},


			add: function(models, options) {
				var opts = _.extend({merge: false}, options, {add: true, remove: false, silent: true, at: 0});
				var set = this.set(models, opts);
				this._addModel(set);
				return set;
			},


			remove: function (models, options) {
				if (!_.isArray(models))
					models = [models];
				var remove, model;
				options = options ? _.clone(options) : {};

				for (var i in models) {
					model = models[i];
					switch (typeof model) {
					case 'string':
					case 'number':
						remove = model;
						break;
					case 'object':
						remove = model;
						if (model.attributes && model.attributes._id)
							remove = model.attributes._id;
						break;
					case 'boolean':
					case 'undefined':
						this._error('Called Backbone.Highway.Collection.remove with invalid model: ', model);
						return;
					}
					this.io.emit('destroy', remove);
				}
				return Backbone.Collection.prototype.remove.call(
					this, models, options
				);
			},

			reset: function (models, options) {
				var ret = false;
				options = options ? _.clone(options) : {};
				// Remove all models remotely.
				this.remove(this.models, {
					silent: true
				});

				if (models) {
					// Add new models.
					ret = this.add(models, {
						silent: true
					});
				}

				// Trigger 'reset' event.
				if (!options.silent) {
					this.trigger('reset', this, options);
				}
				return ret;
			},


			_search: function (options) {
				var self = this;
				if (!_.isEmpty(this.minimum) && this._partial === true) {
					return new Promise(function (success, failure) {
						self.io.emit('search', options, function (records) {
							if (_.isArray(records)) {
								Backbone.Collection.prototype.add.call(self, records);
								success();
							} else {
								failure(records);
							}
						});
					});
				} else {
					return Promise.resolve();
				}
			},
			_filter: function (iteratee, context) {
				var self = this;
				return new Promise(function (success, failure) {
					self._search({})
						.then(function () {
							self._partial = false;
							success(Backbone.Collection.prototype.filter.call(self, iteratee, context));
						}, function(err){
							failure(err);
						});
				});
			},
			_where: function (attr, first) {
				var self = this;
				return new Promise(function (success, failure) {
					self._search({
							search: attr
						})
						.then(function () {
							success(Backbone.Collection.prototype.where.call(self, attr, first));
						});
				});
			},
			_findWhere: function (attr) {
				return this._where(attr, true);
			},



			_childAdded: function (model) {
				Backbone.Collection.prototype.add.call(this, [model]);
			},


			_childChanged: function (snap) {
				if(!this.initialized)
					return;
				var model = snap;

				var item = _.find(this.models, function (child) {
					return child.get('_id') == model._id || !child.id;
				});



				if (!item) {
					if(!this._partial)
						this._childAdded(snap);
					return;
				}

				item.set(model, { dontSave: true });

				this.trigger('sync', this);

			},

			_childRemoved: function (snap) {
				var search = {};
				search[this.idAttribute] = snap[this.idAttribute];
				var model = this.findWhere(search);
				// trigger sync because data has been received from the server
				this.trigger('sync', this);
				Backbone.Collection.prototype.remove.call(this, [model]);
			},

			_updateModel: function (model, options) {
				if (!model || model instanceof HighwayModel){
					return;
				}
				options = options ? _.clone(options) : {};
				if (!options.dontSave && model.id) {
					var save = model.attributes;
					if (save._id !== undefined){
						this.io.emit('update', save);
					}
				}
			},

			_addModel: function (model) {
				var self = this;
				if (!model) {
					return;
				}
				this.io.emit('update', model.attributes, function(attr){
					model.set(attr, {silent: true});
					self._addReference(model);
					self.trigger('add', model, self, {at: 0});
				});
			},

			// Triggered when model.destroy() is called on one of the children.
			_removeModel: function (model) {
				if (!model)
					return;
				this.io.emit('destroy', model);
			},


			_initialSync: function (data) {
				Backbone.Collection.prototype.add.call(this, data, {
					silent: true
				});

				this.trigger('sync', this, null, null);
				this.initialized = true;
			}
		};

		return HighwayCollection;
	}());

	var Model = Backbone.Model.extend({
		constructor: function () {
			Backbone.Model.apply(this, arguments);
			_.extend(this, HighwayModel.prototype);
			HighwayModel.apply(this, arguments);
		}
	});
	var Collection = Backbone.Collection.extend({
		constructor: function (model, options) {
			Backbone.Collection.apply(this, arguments);
			var self = this;
			var BaseModel = self.model;
			switch (typeof this.url) {
			case 'string':
				this.io = io(this.url);
				break;
			case 'function':
				this.io = io(this.url());
				break;
			default:
				throw new Error('url parameter required');
			}

			this.minimum = this.minimum || {};

			if (this.minimum !== {})
				this._partial = true;

			_.extend(this, HighwayCollection.protoype);
			HighwayCollection.apply(this, arguments);

			this.idAttribute = this.idAttribute || BaseModel.prototype.idAttribute;
		}
	});
	Backbone.Highway.Model = Model;
	Backbone.Highway.Collection = Collection;
})(Backbone, _, io);
