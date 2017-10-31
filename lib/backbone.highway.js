(function (Backbone, _, io) {
	if (typeof exports !== 'undefined') {
		Backbone = Backbone || require('backbone');
		_ = _ || require('underscore');
		io = io || require('socket.io-client');
	}

	Backbone.Highway = {};

	const HighwayModel = (function () {
		function HighwayModel() {

		}
		HighwayModel.prototype = {
			_log(msg) {
				console.log(msg);
			},
			_warn(msg) {
				console.warn(msg);
			},
			_error(msg) {
				console.error(msg);
			},
			destroy(options) {
				if (this.collection)
					return this.collection.remove(this, options);
				return Backbone.Model.prototype.destroy.call(this, options);
			},
			sync() {
				// Sync doesn't do anything since everything is autosynced.
				// I'm overloading this method to avoid http errors.
				if (this.collection && this.collection.trigger)
					this.collection.trigger('sync');
				return true;
			},
			set(key, val, options) {
				if (_.isNull(key) || _.isUndefined(key))
					return;
				options = options ? _.clone(options) : {};
				let data = {},
					pieces,
					v,
					root,
					k,
					obj;
				if (_.isObject(key)) {
					options = val ? _.clone(val) : {};
					data = key;
				} else {
					data[key] = val;
				}

				// options = options || {};
				for (k in data)
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

				if (this.collection && this.collection.io && this.get('_id') && !options.dontSave && !options.silent) {
					data._id = this.get('_id');
					if (this.collection.io.connected === false) {
						const collection = this.collection.url.split('/').pop();
						let d = localStorage.getItem(`backfill_${collection}`) || '[]';
						d = JSON.parse(d);
						d.push(data);
						localStorage.setItem(`backfill_${collection}`, JSON.stringify(d));
					} else {
						this.collection.io.emit('update', data);
					}
				}
				return Backbone.Model.prototype.set.call(this, data, options);
			},
			_setRecursive(obj, prop, value) {
				if (typeof prop === 'string')
					prop = prop.split('.');

				if (prop.length > 1) {
					const e = prop.shift();
					this._setRecursive(
						Object.prototype.toString.call(obj[e]) === '[object Object]' ? obj[e] : {},
						prop,
						value);
				} else					{ obj[prop[0]] = value; }
			},
			get(key) {
				let val,
					pieces,
					pieces_length;
				if (key && key.indexOf('.') > -1) {
					pieces = key.split('.');
					pieces_length = pieces.length;
					val = Backbone.Model.prototype.get.call(this, pieces[0]);
					if (val)
						for (let i = 1; i < pieces_length; i++)
							val = typeof val === 'object' ? val[pieces[i]] : void 0;
				} else {
					val = Backbone.Model.prototype.get.call(this, key);
				}
				return _.isArray(val) ? _.clone(val) : val;
			},
			save(data, options) {
				this._warn('Highway Models are automatically synced.  Use .set() instead of .save()');
				this.set.apply(this, arguments);
			},
			clear(options) {
				const attrs = {};
				for (const key in this.attributes)
					if (key != '_id') attrs[key] = void 0;
				return this.set(attrs, _.extend({}, options, {
					unset: true,
				}));
			},
		};

		return HighwayModel;
	}());

	const HighwayCollection = (function () {
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
			// console.log('highway');
			// Handle any models added to the collection
			// this.listenTo(this, 'add', this._addModel, this);
			this.on('add', this._addModel);
			// Handle changes in any local models.
			this.on('change', this._updateModel);
			// Listen for destroy event to remove models.
			this.listenTo(this, 'destroy', this._removeModel, this);

			this.listenTo(this, 'highway:model_created', this._preventSync, this);
		}


		HighwayCollection.protoype = {

			_log(msg) {
				console.log(msg);
			},
			_warn(msg) {
				console.warn(msg);
			},
			_error(msg) {
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
			_create(model, options) {
				const self = this;
				options = options ? _.clone(options) : {};

				if (options.wait)
					this._log('ignoring wait');


				if (!model)
					return Promise.reject(new Error('No model provided'));

				return new Promise((success, failure) => {
					self.io.emit('create', model, (data) => {
						self._preventSync(false, true);
						const set = Backbone.Collection.prototype.add.call(self, [data], options);
						self._preventSync(false, false);
						success(set);
					});
				});
			},

			create(model, options) {
				options = options ? _.clone(options) : {};
				const wait = options.wait;
				model = this._prepareModel(model, options);
				if (!model) return false;
				if (wait)
					this._log('Ignoring wait');
				this.add(model, options);
				return model;
			},


			add(models, options) {
				const opts = _.extend({
					merge: false,
				}, options, {
					add   : true,
					remove: false,
					silent: true,
					at    : 0,
				});
				const set = this.set(models, opts);
				this._addModel(set, opts);
				return set;
			},


			remove(models, options) {
				if (!_.isArray(models))
					models = [models];
				let remove,
					model;
				options = options ? _.clone(options) : {};

				for (const i in models) {
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
					this, models, options,
				);
			},

			reset(models, options) {
				let ret = false;
				options = options ? _.clone(options) : {};
				// Remove all models remotely.
				this.remove(this.models, {
					silent: true,
				});

				if (models)
					// Add new models.
					ret = this.add(models, {
						silent: true,
					});


				// Trigger 'reset' event.
				if (!options.silent)
					this.trigger('reset', this, options);

				return ret;
			},


			_search(options) {
				const self = this;
				if (!_.isEmpty(this.minimum) && this._partial === true)
					return new Promise((success, failure) => {
						self.io.emit('search', options, (records) => {
							if (_.isArray(records)) {
								Backbone.Collection.prototype.add.call(self, records);
								success();
							} else {
								failure(records);
							}
						});
					});
				 return Promise.resolve();
			},
			_filter(iteratee, context) {
				const self = this;
				return new Promise((success, failure) => {
					self._search({})
						.then(() => {
							self._partial = false;
							success(Backbone.Collection.prototype.filter.call(self, iteratee, context));
						});
				});
			},
			_where(attr, first) {
				const self = this;
				return new Promise((success, failure) => {
					self._search({
						search: attr,
					})
						.then(() => {
							success(Backbone.Collection.prototype.where.call(self, attr, first));
						});
				});
			},
			_findWhere(attr) {
				return this._where(attr, true);
			},


			_childAdded(model) {
				Backbone.Collection.prototype.add.call(this, [model]);
			},


			_childChanged(snap) {
				if (!this.initialized)
					return;
				const model = snap;

				const item = _.find(this.models, child => child.get('_id') == model._id || !child.id);


				if (!item) {
					if (!this._partial)
						this._childAdded(snap);
					return;
				}

				item.set(model, {
					dontSave: true,
				});
				this.trigger('sync', this);
			},

			_childRemoved(snap) {
				const search = {};
				search[this.idAttribute] = snap[this.idAttribute];
				const model = this.findWhere(search);
				// trigger sync because data has been received from the server
				this.trigger('sync', this);
				Backbone.Collection.prototype.remove.call(this, [model]);
			},

			_updateModel(model, options) {
				if (!model || model instanceof HighwayModel)
					return;

				options = options ? _.clone(options) : {};
				if (!options.dontSave && model.id) {
					const save = model.attributes;
					if (save._id !== undefined)
						this.io.emit('update', save);
				}
			},

			_addModel(model) {
				const self = this;
				if (!model || model.attributes._id || this._remoteChanging) {
					this.trigger('highway:model_created');
					return;
				}
				// this.io.emit('update', model.attributes, (attr) => {
				this.io.emit('create', model.attributes, (attr) => {
					model.set(attr, {
						silent: true,
					});
					self._addReference(model);
					self.trigger('add', model, self, {
						at: 0,
					});
				});
			},

			// Triggered when model.destroy() is called on one of the children.
			_removeModel(model) {
				if (!model)
					return;
				this.io.emit('destroy', model);
			},

			_preventSync(model, state) {
				if (!model)
					this._remoteChanging = state || false;
				else
					model._remoteChanging = state || false;
			},

			_initialSync(data) {
				Backbone.Collection.prototype.add.call(this, data, {
					silent: true,
				});

				this.trigger('sync', this, null, null);
				this.initialized = true;
			},
			_backfillData() {
				const collectionName = this.url.split('/').pop();
				let data = localStorage.getItem(`backfill_${collectionName}`);
				if (data !== null) {
					data = JSON.parse(data);
					let d;
					while ((d = data.pop()) !== void 0)
						if (typeof d === 'object' && d._id)
							this.io.emit('update', d);

					localStorage.setItem(`backfill_${collectionName}`, '[]');
				} else {

				}
			},
		};

		return HighwayCollection;
	}());

	const Model = Backbone.Model.extend({
		constructor() {
			Backbone.Model.apply(this, arguments);
			_.extend(this, HighwayModel.prototype);
			HighwayModel.apply(this, arguments);
		},
	});
	const Collection = Backbone.Collection.extend({
		constructor(model, options) {
			Backbone.Collection.apply(this, arguments);
			const self = this;
			const BaseModel = self.model;
			const connectionOptions = {
				timeout: 500,
			};
			switch (typeof this.url) {
			case 'string':
				this.io = io(this.url, connectionOptions);
				break;
			case 'function':
				this.io = io(this.url(), connectionOptions);
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

			this.io.on('connect', this._backfillData.bind(this));
			this.io.on('reconnect', this._backfillData.bind(this));
		},
	});
	Backbone.Highway.Model = Model;
	Backbone.Highway.Collection = Collection;
}(Backbone, _, io));
