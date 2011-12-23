Backbone.SharePoint
===================

Backbone.SharePoint provides special Models and Collections which you can extend to work with SharePoint Items and Lists.
It uses the SharePoint ListData.svc REST service (which is based on OData []) 

With Backbone.SharePoint you can:
- create, read, update and delete SharePoint items as Backbone models
- fetch multiple SharePoint items from a List as a Backbone collection
- support for OData query string options ($orderby, $filter, $select, etc)

Contents
--------
- [Getting started](#installation)
- [Backbone.SP.Item](#Item)
- [Backbone.SP.List](#List)
- [Examples](#examples)
- [Tests](#tests)

Getting started
---------------

```html
<script type="text/javascript" src="./js/underscore.js"></script>
<script type="text/javascript" src="./js/backbone.js"></script>
<script type="text/javascript" src="./js/backbone-sharepoint.js"></script>

```


## <a name="examples"/>Examples



Tests
-----
The test directory contains a unit test suite based on QUnit. Run the test.html.