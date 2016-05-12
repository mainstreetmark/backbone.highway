# backbone.highway

[![Build Status](https://travis-ci.org/krewenki/backbone.highway.svg?branch=master)](https://travis-ci.org/krewenki/backbone.highway)
[![Coverage Status](https://coveralls.io/repos/github/krewenki/backbone.highway/badge.svg?branch=master)](https://coveralls.io/github/krewenki/backbone.highway?branch=master)

A backbone plugin for use with [Highway](https://github.com/krewenki/highway) to provide realtime updates to models and collections.

To use, have a Highway server running somewhere, and create a new collection:


Collections
===

To read all models in a database collection, create a new `Highway.Collection` and
instantiate it.  

```javascript
var ItemModel = Backbone.Highway.Model.extend({});
var ItemsCollection = Backbone.Highway.Collection.extend({
    url: 'url.to.your/database/collection',
    model: ItemModel
})
var Items = new ItemsCollection();
```

Create
----

To create a new item in a collection call `Collection.create()` and provide it
an object that contains your attributes.  `Backbone.Highway` will then create
a new record in the database and return a corresponding model.

```javascript
var ItemAttributes = {
  name: 'Dish Soap'
};
var NewItem = Items.create(ItemAttributes);
```


Update
----
Models and collections are automatically kept in sync.  This means that as soon
as you `.set()` attributes of a model that belongs to a collection, the database
will be updated and all other connected clients will see the change.

```javascript
var Item = Items.at(0);
Item.set({ name: 'Dish Detergent'}); // Everyone will see this instantly
```


Destroy
----
To remove a model from the database, call `Collection.remove(<Model>)`. This will
remove the model from your collection, as well as from the database and all other clients
collections.

```javascript
var Item = Items.at(0);
Items.remove(Item);
```


Partial Collection Loading
====

Sometimes collections on the server are very large and you don't want to force the
client to download the whole thing until they need it.  Providing constraints in the
`Collection.minimum` object limits the amount of data your initial set will contain.

```javascript
var ItemModel = Backbone.Highway.Model.extend({});
var ItemsCollection = Backbone.Highway.Collection.extend({
    url: 'url.to.your/database/collection',
    model: ItemModel,
    minimum: {
      limit: 20,
      skip: 10,
      search: {
        name: 'Soap'
      }
    }
})
var Items = new ItemsCollection();
```

Filtering partial collections
----

Loading a partial collection allows you to have less content in your users browser,
but sometimes you need to filter a collection against the entire dataset.  You can do this
by using `Collection._filter` which operates the same as `Backbone.Collection.filter` with
the exception that it returns a promise instead of an array.

```javascript
function LogicAfterFilter(filteredResult){
  console.log(filteredResult);
}
var ItemModel = Backbone.Highway.Model.extend({});
var ItemsCollection = Backbone.Highway.Collection.extend({
    url: 'url.to.your/database/collection',
    model: ItemModel,
    minimum: {
      limit: 20,
      skip: 10,
      search: {
        name: 'Soap'
      }
    }
});
var Items = new ItemsCollection();
Items._filter(function(item){
  return item.get('type') == 'soap';
}).then(LogicAfterFilter);
```


Models
===

```javascript
var User = new Backbone.Highway.Model.extend({
  default: {
    name: 'Steve'
  }
});

var U = new User();
```
