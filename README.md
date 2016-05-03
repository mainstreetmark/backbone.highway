# backbone.highway

[![Coverage Status](https://coveralls.io/repos/github/krewenki/backbone.highway/badge.svg?branch=master)](https://coveralls.io/github/krewenki/backbone.highway?branch=master)

A backbone plugin for use with [Highway](https://github.com/krewenki/highway) to provide realtime updates to models and collections.

To use, have a Highway server running somewhere, and create a new collection:

<pre>
var Items = new Backbone.Highway.Collection.extend({
    url: '/database/collection',
    io: <your socket.io object>
})
</pre>

All CRUD happens through the collection.

Create
<pre>
Items.create(newItemModel);
</pre>

<pre>
Items.where()
</pre>

<pre>
Items.models[0].set({ attribute: value })
</pre>

<pre>
Items.models[0].remove()
</pre>
