# backbone.highway

[![Build Status](https://travis-ci.org/krewenki/backbone.highway.svg?branch=master)](https://travis-ci.org/krewenki/backbone.highway)
[![Coverage Status](https://coveralls.io/repos/github/krewenki/backbone.highway/badge.svg?branch=master)](https://coveralls.io/github/krewenki/backbone.highway?branch=master)

A backbone plugin for use with [Highway](https://github.com/krewenki/highway) to provide realtime updates to models and collections.

To use, have a Highway server running somewhere, and create a new collection:


Collections
===
<pre>
var Items = new Backbone.Highway.Collection.extend({
    url: 'url.to.your/database/collection'
})
</pre>

All CRUD happens through the collection.

Create
<pre>
Items.create(newItemModel);
</pre>

Read
<pre>
Items.where()
</pre>

Update
<pre>
Items.models[0].set({ attribute: value })
</pre>

Destroy
<pre>
Items.models[0].remove()
</pre>

Models
===

<pre>
var User = new Backbone.Highway.Model.extend({
  default: {
    name: 'Steve'
  }
});
</pre>
