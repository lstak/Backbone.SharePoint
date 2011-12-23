Backbone.SharePoint
===================

Backbone.SharePoint provides special Models and Collections which you can extend to work with SharePoint Items and Lists.
It is a wrapper around the SharePoint ListData.svc REST service which is based on [OData](http://www.odata.org). 


Backbone.SharePoint features:
- create, read, update and delete SharePoint items as Backbone models
- fetch multiple SharePoint items from a list as a Backbone collection
- support for OData query string options ($orderby, $filter, $select, etc)
- JSON payloads
- custom sync() to communicate with the ListData service
- partial updates: only changed attributes are sent to the server during an update.



Contents
--------
- [Getting started](#installation)
- [Backbone.SP.Item](#Item)
- [Backbone.SP.List](#List)
- [Examples](#examples)
- [Tests](#tests)

Getting started
---------------
Because of the Same Origin Policy, your html file must served from the same domain as the SharePoint site you want to access. 
You can place your html file containing your app on the server file system or in an asset library.  


index.html: 
```html
<!doctype html>
<html>
...
<script type="text/javascript" src="jquery.js"></script> 
<!-- you can also use zepto.js -->

<script type="text/javascript" src="underscore.js"></script>
<script type="text/javascript" src="backbone.js"></script>
<script type="text/javascript" src="backbone-sharepoint.js"></script>


</html>
```

## <a name="examples"/>Examples

Now let's look at some examples how you can use Backbone.SharePoint. Let's assume you have a subsite '/teamsite' in which you have 
created a Contacts list based on the standard contacts list. 

```js

// You define the Contact Item by extending Backbone.SP.Item
// Required parameters are the SharePoint site and the name of the list

var Contact = Backbone.SP.Item.extend({
	site: '/teamsite'
	list: 'Contacts'
})


// Create a new contact, the attributes refer to item column names.
var contact = new Contact({ LastName: "Davis" });


// At this point we have a new contact model, but is not saved to the server, 
// so let's save it to the server.
contact.save();

// Update the attributes of the Item:
contact.set({FirstName: "John"});
contact.save(); 

// Finaly, to remove an item:
contact.destroy();





```

## <a name="tests"/>Tests
-----
The 'test' directory contains a unit test suite based on QUnit. Open test.html in browser to run the tests.