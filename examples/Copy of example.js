var Contact = Backbone.SP.Item.extend({
  site: '/teamsite',
  list: 'Contacts'
})


var Contacts = Backbone.SP.List.extend({
  model: Contact
})

var contacts = new Contacts;

var success = function (collection, response) {
    $("#result").append(prettyPrint(response, { maxDepth: 8, maxArray: 10 }))
  }

  $(function () {
    $("body").html('<div id=#command>Command</div><div id="result"></div>')

    var command = "contacts.fetch()";
    var options = { success: success, filter: 'Id eq 1', inlinecount: 'allpages' }

    
   
    
    /*
    contacts.create({ LastName: 'Santa Claus' }, options)
    */
  })