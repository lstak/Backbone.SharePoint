Backbone.SharePoint
===================

Backbone.SharePoint extends Backbone Models and Collections so you can easily work with SharePoint Items and Lists.
Its custom sync() method is a wrapper around the SharePoint ListData.svc REST service which is based on [OData](http://www.odata.org). 

Backbone.SharePoint features:

* create, read, update and delete SharePoint items as Backbone models
* fetch multiple SharePoint items from a list as a Backbone collection
* support for OData query string options (orderby, filter, select, etc)
* JSON payloads
* custom sync() to communicate with the ListData service
* partial updates: only changed attributes are sent to the server during an update
* lightweight


NEW: I am extending Backbone.SharePoint to also support the use of SharePoint Web Services.
Experimental support for fetching Backbone Collections through Lists.asmx is now available in 
file backbone-sharepoint.soap.js



Contents
--------
* [Getting started - OData](#gettingstarted_odata)
* [Examples](#examples)
* [Tests](#tests)
* [Getting started - Soap](#gettingstarted_soap)


## <a name="gettingstarted_odata"/>Getting started with OData service

Because of the Same Origin Policy, your html file must served from the same domain as the SharePoint site you want to access. 
You can place your html file containing your app on the server file system or in an asset library.  


index.html:
 
```html


<!doctype html>
<html>
   ....
<script src="jquery.js"></script> 
<!-- you can also use zepto.js -->

<script src="underscore.js"></script>
<script src="backbone.js"></script>
<script src="backbone-sharepoint.odata.js"></script>
  ...

</html>

```

## <a name="examples"/>Examples

Now let's look at some examples how you can use Backbone.SharePoint. In these examples we will assume you have 
a subsite '/teamsite' in which you have 
created a Contacts list based on the standard contacts list template. 

```js

// You define a Contact Model for items by extending Backbone.SP.Item
// Required parameters are the SharePoint site and the name of the list

var Contact = Backbone.SP.Item.extend({
	site: '/teamsite',
	list: 'Contacts'
})


// Create a new contact, the attributes refer to item column names.
// Please note capitals. We follow SharePoint conventions
var contact = new Contact({ LastName: "Davis" })


// At this point we have a new contact model, but is not yet saved to the server.
// So let's save it to the server.
contact.save()

  ....

// Update the attributes of the Item:
contact.set({FirstName: "John"})
contact.save()

  ...


// Finally, to remove an item:
contact.destroy()


```

You can work with SharePoint lists just like collections.


```javascript

// you can define a SP List by extending Backbone.SP.List.
// Configure the list by associating it with a Model extended from Backbone.SP.Item 
var Contacts = Backbone.SP.List.extend({
	model: Contact
})

// now, you can create a list
var contacts = new Contacts


// get contacts list from the server
contacts.fetch()


// the fetch options allow you to use query options
// for example, the request below will fetch only the LastName and FirstName columns
// for item 11..15 when ordered descending by LastName
contacts.fetch({
	select: 'LastName, FirstName',
	orderby: 'LastName desc',
	top: 5,
	skip:10
})



   ....


// This is how you can create a new contact, save it to the server and add it to the list (collection)
contacts.create({
	LastName: "Peel",
	FirstName: "Emma"
})



```

Hopefully this is sufficient to get you going!


## <a name="tests"/>Tests
The 'test' directory contains a unit tests based on QUnit. Open test.html in browser to run the tests.


## <a name="gettingstarted_odata"/>NewL Getting started with SOAP service

Instead of the odata file, include the backbone-sharepoint soap version:

 
```html


<!doctype html>
<html>
   ....
<script src="jquery.js"></script> 
<!-- you can also use zepto.js -->

<script src="underscore.js"></script>
<script src="backbone.js"></script>
<script src="backbone-sharepoint.soap.js"></script>
<script>
var Contact = Backbone.SP.Item.extend({
})


var Contacts = Backbone.SP.List.extend({
    model: Contact,
    site: '/teamsite',
    list: 'Contacts',
    view: ''  //  default view, you can also provide viewId: '{GUID}'
})


var ContactsView = Backbone.View.extend({

    tagName: "ul",

    tpl: _.template("<% _.each(contacts, function(contact) { %> <li><%= contact.Title + ', ' + contact.FirstName %></li> <% }); %>"),

    render: function () {
        
        $(this.el).html(this.tpl({ contacts: this.collection.toJSON() }));
        $('body').append(this.el);
    }

});


$(function () {
    var contacts = new Contacts;
    var view = new ContactsView({ collection: contacts });
    contacts.bind("reset", view.render, view);
    contacts.fetch()
})
</script>

</html>

```