(function(Backbone, _) {
	'use strict';

	Backbone.Highway = {};

	var HighwayModel = (function(){
		function HighwayModel(){

		}
	})();

	var HighwayCollection = (function() {

		function HighwayCollection() {
			this.idAttribute = '_id';

			// Add handlers for remote events
			this.io.on('child_added', _.bind(this._childAdded, this));
			this.io.on('child_changed', _.bind(this._childChanged, this));
			this.io.on('child_removed', _.bind(this._childRemoved, this));
			this.io.on('all_records', _.bind(this._initialSync, this));

			_.defer(_.bind(function() {
				this.io.emit('init', this.table);
			}, this));

			// Handle changes in any local models.
			this.listenTo(this, 'change', this._updateModel, this);
			// Listen for destroy event to remove models.
			//this.listenTo(this, 'destroy', this._removeModel, this);
		}


		HighwayCollection.protoype = {

			create: function(model, options) {
				var self = this;
				options = options ? _.clone(options) : {};
				if (!model) {
					return false;
				}
				this.io.emit('create', model, function(data){ self.add([data], options);});
				return;
			},

			remove: function(models, options) {
				if (!_.isArray(models))
					models = [models]
				for (var i in models) {
					this.io.emit('destroy', models[i].toJSON())
					Backbone.Collection.prototype.remove.call(
						this, [models[i]]
					);
				}
			},

			reset: function(models, options) {
				options = options ? _.clone(options) : {};
				// Remove all models remotely.
				this.remove(this.models, {
					silent: true
				});

				if(models){
					// Add new models.
					var ret = this.add(models, {
						silent: true
					});
				}

				// Trigger 'reset' event.
				if (!options.silent) {
					this.trigger('reset', this, options);
				}
				return ret;
			},


			_childAdded: function(model) {
				Backbone.Collection.prototype.add.call(this, [model]);
			},


			_childChanged: function(snap) {
				var idAttribute = this.idAttribute;
				var model = snap

				var item = _.find(this.models, function(child) {
					return child.get('_id') == model[idAttribute];
				});

				if (!item) {
					this._childAdded(snap);
					return;
				}

				this._preventSync(item, true);

				// find the attributes that have been deleted remotely and
				// unset them locally
				var diff = _.difference(_.keys(item.attributes), _.keys(model));

				_.each(diff, function(key) {
					item.unset(key);
				});

				item.set(model);

				// fire sync since this is a response from the server
				this._preventSync(item, false);
				this.trigger('sync', this);

			},

			_childRemoved: function(snap) {
				var search = {};
				search[this.idAttribute] = snap[this.idAttribute];
				var model = this.findWhere(search);
					// trigger sync because data has been received from the server
					this.trigger('sync', this);
					Backbone.Collection.prototype.remove.call(this, [model]);
			},

			_updateModel: function(model) {
				if (!model._remoteChanging)
					this.io.emit('update', model.toJSON());
			},

			// Triggered when model.destroy() is called on one of the children.
			_removeModel: function(model, collection, options) {
				options = options ? _.clone(options) : {};
				options.success =
					_.isFunction(options.success) ? options.success : function() {};
				this.io.emit('destroy', model)
			},

			_preventSync: function(model, state) {
				model._remoteChanging = state || false;
			},

			_initialSync: function(d) {

				this.add(d, {
					silent: true
				})

				this.trigger('sync', this, null, null);

			}
		};

		return HighwayCollection;
	}());

	var Model = Backbone.Model.extend({
		_.extend(this, HighwayModel.protoype);
		HighwayModel.apply(this, arguments);
	});
	var Collection = Backbone.Collection.extend({
		constructor: function(model, options) {
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

			_.extend(this, HighwayCollection.protoype);
			HighwayCollection.apply(this, arguments);

			// XXX before breaking model prototype: worked around this.model.prototype.idAttribute with this.idAttribute
			this.idAttribute = this.idAttribute || BaseModel.prototype.idAttribute;
		}
	});
	Backbone.Highway.Model = Model;
	Backbone.Highway.Collection = Collection;
})(window.Backbone, window._);
