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
			save: function (data, options) {
				console.warn('Highway Models are automatically synced.  Use .set() instead of .save()');
				this.set(data, options);
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
				return true;
			}
		};
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
			this.listenTo(this, 'change', this._updateModel, this);
			// Listen for destroy event to remove models.
			this.listenTo(this, 'destroy', this._removeModel, this);
		}


		HighwayCollection.protoype = {

			_log: function (msg) {
				console.log(msg);
			},

			_parseModels: function (models, options) {
				var pushArray = [];
				// check if the models paramter is an array or a single object
				var singular = !_.isArray(models);
				// if the models parameter is a single object then wrap it into an array
				models = singular ? (models ? [models] : []) : models.slice();

				for (var i = 0; i < models.length; i++) {
					var model = models[i];

					// call Backbone's prepareModel to apply options
					model = Backbone.Collection.prototype._prepareModel.call(
						this, model, options
					);

					if (model.toJSON && typeof model.toJSON == 'function') {
						model = model.toJSON();
					}

					pushArray.push(model);

				}

				return pushArray;
			},

			/**
			 * add a model to a collection and save it to the server
			 * @method add
			 * @param  {array} models  [description]
			 * @param  {object} options [description]
			 */
			add: function (models, options) {
				// prepare models
				var parsed = this._parseModels(models);
				options = options ? _.clone(options) : {};
				options.success =
					_.isFunction(options.success) ? options.success : function () {};

				for (var i = 0; i < parsed.length; i++) {
					var model = parsed[i];

					parsed[i] = this.create(parsed[i].attributes, options);
				}

				return parsed;
			},
			create: function (model, options) {
				var self = this;
				options = options ? _.clone(options) : {
					success: function () {}
				};

				if (options.wait) {
					this._log('ignoring wait');
				}

				if (!model) {
					return false;
				}

				var set = Backbone.Collection.prototype.add.call(self, [model], options);

				this.io.emit('create', model, function (data) {
					set[0].set(data, {
						silent: true,
						trigger: false
					});

					if (typeof options.success == 'function')
						options.success(data);
				});
				return set[0];
			},

			_create: function (model, options) {
				var self = this;
				options = options ? _.clone(options) : {};

				if (options.wait) {
					this._log('ignoring wait');
				}

				if (!model) {
					return false;
				}

				return new Promise(function (success, failure) {
					this.io.emit('create', model, function (data) {
						var set = Backbone.Collection.prototype.add.call(self, [data], options);
						success(set[0]);
					});
				});
			},

			remove: function (models, options) {
				if (!_.isArray(models))
					models = [models];
				if (options.silent)
					this._suppressEvent = true;
				for (var i in models) {
					if (models[i].toJSON)
						this.io.emit('destroy', models[i].toJSON());
					else
						this._log('You need to pass models to .remove()');
					Backbone.Collection.prototype.remove.call(
						this, [models[i]]
					);
				}
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
							Backbone.Collection.prototype.add.call(self, records);
							success();
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
				var self = this;
				return _.where(attr, true);
			},



			_childAdded: function (model) {
				Backbone.Collection.prototype.add.call(this, [model]);
			},


			_childChanged: function (snap) {

				var model = snap;

				var item = _.find(this.models, function (child) {
					return child.get('_id') == model._id;
				});

				if (!item) {
					this._childAdded(snap);
					return;
				}

				this._preventSync(item, true);

				// find the attributes that have been deleted remotely and
				// unset them locally
				/*	var diff = _.difference( _.keys( item.attributes ), _.keys( model ) );

					_.each( diff, function ( key ) {
						item.unset( key );
					} ); */

				item.set(model);

				// fire sync since this is a response from the server
				this._preventSync(item, false);
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

			_updateModel: function (model) {
				if (!model)
					return;
				if (!model._remoteChanging) {
					var save = _.extend({
						"_id": model.get('_id')
					}, model.changedAttributes());
					if (save._id !== undefined)
						this.io.emit('update', save);
				}
			},

			// Triggered when model.destroy() is called on one of the children.
			_removeModel: function (model, collection, options) {
				options = options ? _.clone(options) : {};
				options.success =
					_.isFunction(options.success) ? options.success : function () {};
				this.io.emit('destroy', model);
			},

			_preventSync: function (model, state) {
				model._remoteChanging = state || false;
			},

			_initialSync: function (d) {
				if (this.minimum !== {})
					this._partial = true;

				Backbone.Collection.prototype.add.call(this, d, {
					silent: true
				});

				this.trigger('sync', this, null, null);

			}
		};

		return HighwayCollection;
	}());

	var Model = Backbone.Model.extend({
		set: function (key, val, options) {
			var data = {},
				pieces, v, root, k, obj;
			if (_.isObject(key)) {
				data = key;
			} else {
				data[key] = val;
			}
			for (k in data) {
				if (k.indexOf('.') > -1) {
					obj = JSON.parse(JSON.stringify(this.get(k.split('.')
						.shift())));
					this._setRecursive(obj, k.split('.')
						.splice(1)
						.join('.'), data[k]);
					data[k.split('.')
						.shift()] = obj;
					delete data[k];
				}
			}
			return Backbone.Model.prototype.set.call(this, data, options);
		},
		_setRecursive: function (obj, prop, value) {
			if (typeof prop === "string")
				prop = prop.split(".");

			if (prop.length > 1) {
				var e = prop.shift();
				this._setRecursive(obj[e] =
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

			// Look for and apply a minimum set
			this.minimum = this.minimum || {};

			_.extend(this, HighwayCollection.protoype);
			HighwayCollection.apply(this, arguments);

			this.idAttribute = this.idAttribute || BaseModel.prototype.idAttribute;
		}
	});
	Backbone.Highway.Model = Model;
	Backbone.Highway.Collection = Collection;
})(Backbone, _, io);
