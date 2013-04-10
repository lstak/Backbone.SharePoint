$(document).ready(function () {


  // don't reorder tests
  QUnit.config.reorder = false;

  var Item = Backbone.SP.Item,
      List = Backbone.SP.List,
      Contact,
      Contacts,
      contacts,
      lastrequest,
      xhr, xhrWithoutEtag;


  module("Backbone.SharePoint", {
    setup: function () {
      // reset values
      lastRequest = null;

      // Model
      Contact = Item.extend({
        site: '/teamsite',
        list: 'Contacts'
      });

      // Collection
      Contacts = List.extend({
        model: Contact
      });
      contacts = new Contacts;

      xhr = {
        getResponseHeader: function (headerName) {
          if (headerName == 'Etag') return "W-updated"

          return "Unknown"

        }
      };

      xhrWithoutEtag = {
        getResponseHeader: function (headerName) {
          if (headerName == 'Etag') return null

          return "Unknown"

        }
      };

      $.ajax = function (obj) {
        lastRequest = obj;
      };
    },
    teardown: function () {
    }
  });


  test("Item: new", function () {
    var attrs = {
      LastName: 'Faulkner',
      FirstName: 'William'
    };

    var contact = new Contact(attrs);
    deepEqual(contact.attributes, attrs);
    ok(contact.isNew());
    deepEqual(contact.toJSON(), attrs);
  });


  test("Item: set()", function () {
    var attrs = {
      LastName: 'Faulkner',
      FirstName: 'William'
    };

    var contact = new Contact(attrs);
    deepEqual(contact.attributes, attrs);

    var update = {
      FirstName: 'Bill',
      JobTitle: 'Writer'
    }

    contact.set(update);
    deepEqual(contact.attributes, _.extend(attrs, update))

  });

  test("Item: get()", function () {
    var attrs = {
      LastName: 'Faulkner',
      FirstName: 'William'
    };

    var contact = new Contact(attrs);
    deepEqual(contact.attributes, attrs);


    equal(contact.get('LastName'), attrs.LastName);
    equal(contact.get('FirstName'), attrs.FirstName);
    ok(_.isUndefined(contact.get('UnknownAttribute')));
  });


  test("Item: url()", function () {
    var contact;

    // try root site
    contact = new (Item.extend({ site: '/', list: 'Contacts' }));
    equal(contact.url(), '/_vti_bin/ListData.svc/Contacts')

    // try empty site, should resolve to root
    contact = new (Item.extend({ site: '', list: 'Contacts' }));
    equal(contact.url(), '/_vti_bin/ListData.svc/Contacts')

    // try subsite
    contact = new (Item.extend({ site: '/teamsite', list: 'Contacts' }));
    equal(contact.url(), '/teamsite/_vti_bin/ListData.svc/Contacts')

    // try subsite without leading slash
    contact = new (Item.extend({ site: 'teamsite', list: 'Contacts' }));
    equal(contact.url(), '/teamsite/_vti_bin/ListData.svc/Contacts')

    // try subsite with trailing slash
    contact = new (Item.extend({ site: '/teamsite/', list: 'Contacts' }));
    equal(contact.url(), '/teamsite/_vti_bin/ListData.svc/Contacts')

    // try subsite 3 levels deep with trailing slash
    contact = new (Item.extend({ site: '/sub1/sub2/sub3', list: 'Contacts' }));
    equal(contact.url(), '/sub1/sub2/sub3/_vti_bin/ListData.svc/Contacts')

    // try different list name
    contact = new (Item.extend({ site: '/sub1/sub2/sub3', list: 'Tasks' }));
    equal(contact.url(), '/sub1/sub2/sub3/_vti_bin/ListData.svc/Tasks')

    // try different list name
    contact = new (Item.extend({ site: '/sub1/sub2/sub3', list: 'Tasks' }));
    equal(contact.url(), '/sub1/sub2/sub3/_vti_bin/ListData.svc/Tasks')

    // try an existing model
    Contact = Item.extend({ site: '/sub1/sub2/sub3', list: 'Tasks' })
    contact = new Contact({ Id: 12 });
    equal(contact.url(), '/sub1/sub2/sub3/_vti_bin/ListData.svc/Tasks(12)')


  });


  test("Item: fetch()", function () {
    var attrs = { Id: 12 };

    // faked response from server
    var response = {
      d: {
        Id: 12,
        LastName: 'Faulkner',
        FirstName: 'William',
        __metadata: {
          etag: 'W8'
        }
      }
    };



    $.ajax = function (obj) {
      lastRequest = obj;
      obj.success(response, status, xhr);
    };

    var contact = new Contact(attrs);
    deepEqual(contact.attributes, attrs);
    equal(contact.url(), '/teamsite/_vti_bin/ListData.svc/Contacts(12)');

    contact.fetch();

    equal(lastRequest.url, '/teamsite/_vti_bin/ListData.svc/Contacts(12)');
    equal(lastRequest.type, 'GET');
    equal(lastRequest.dataType, 'json');

    // request data should be empty
    ok(_.isEmpty(lastRequest.data));

    // response should be parsed into model
    deepEqual(contact.attributes, response.d);

  });



  test("Item: save()", function () {

    var attrs = {
      LastName: 'Faulkner',
      FirstName: 'William'
    }
    var contact = new Contact(attrs);

    var response = {
      d: {
        Id: 12,
        LastName: 'Faulkner',
        FirstName: 'William',
        CreatedBy: 'John Doe',
        __metadata: {
          etag: 'W8'
        }
      }
    };

    $.ajax = function (obj) {
      lastRequest = obj;
      obj.success(response, status, xhr)
    };

    ok(contact.isNew());

    contact.save();
    ok(!lastRequest.processData);
    ok(!contact.isNew());
    equal(lastRequest.url, '/teamsite/_vti_bin/ListData.svc/Contacts');
    equal(lastRequest.type, 'POST');
    equal(lastRequest.dataType, 'json');

    // request data should be identical to initial attributes
    var data = JSON.parse(lastRequest.data);
    deepEqual(attrs, data);

    // server response should be parsed into model
    deepEqual(contact.attributes, response.d);

  });




  test("Item: destroy()", function () {
    var contact = new Contact({ Id: 12 });

    contact.destroy();

    equal(lastRequest.url, '/teamsite/_vti_bin/ListData.svc/Contacts(12)');
    equal(lastRequest.type, 'DELETE');
    equal(lastRequest.dataType, 'json');

    // request data should be empty
    ok(_.isEmpty(lastRequest.data));

  });

  test("Item: save() - updates", function () {

    var attrs = {
      LastName: 'Faulkner',
      FirstName: 'William'
    }


    var response = {
      d: {
        Id: 12,
        //LastName: 'Faulkner',
        //FirstName: 'William',
        CreatedBy: 'John Doe',
        __metadata: {
          etag: 'W8'
        }
      }
    };

    $.ajax = function (obj) {
      lastRequest = obj;
      obj.success(response, status, xhr)
    };

    var contact = new Contact(attrs);
    ok(contact.isNew());

    // first save
    contact.save();
    // saving new record, there should be no headers
    equal(lastRequest.headers, undefined);

    ok(!contact.isNew());

    var update = {
      FirstName: 'Bill',
      JobTitle: 'Writer'
    };

    contact.set(update);
    contact.save();
    deepEqual(contact.attributes, _.extend(attrs, response.d, update))


    equal(lastRequest.url, '/teamsite/_vti_bin/ListData.svc/Contacts(12)');

    equal(lastRequest.dataType, 'json');

    // test Method tunneling
    equal(lastRequest.type, 'POST');
    equal(lastRequest.headers["X-HTTP-Method"], 'MERGE');

    // the last request should have the an etag
    equal(lastRequest.headers["If-Match"], 'W-updated');


    // request data should only contain changed attributes
    var data = JSON.parse(lastRequest.data);
    deepEqual(data, update);

    var update2 = {
      JobTitle: 'Writer2',
      Telephone: '+1-800-123495'
    };

    contact.attributes.__metadata.etag = "W"
    contact.save(update2);
    deepEqual(contact.attributes, _.extend(attrs, response.d, update, update2))
    var data = JSON.parse(lastRequest.data);
    deepEqual(data, update2);

    // is contact model metadata etag properly updated?
    equal(contact.attributes.__metadata.etag, 'W-updated');


  });


  test("Item: save() - updates2", function () {

    var contact = new Contact({ Id: 12 });

    var response = {
      d: {
        Id: 12,
        CreatedBy: 'John Doe',
        __metadata: {
          etag: 'W8'
        }
      }
    };

    $.ajax = function (obj) {
      lastRequest = obj;
      obj.success(response, status, xhr)
    };

    contact.fetch();

    var update = {
      FirstName: 'Bill',
      JobTitle: 'Writer'
    };
    var update2 = {
      JobTitle: 'Writer2',
      Telephone: '+1-800-123495'
    };

    contact.set(update);
    contact.set(update2);
    contact.save();

    deepEqual(contact.attributes, _.extend(response.d, update, update2))
    var data = JSON.parse(lastRequest.data);
    deepEqual(data, _.extend(update, update2));

  });


  test("Item: unset()", function () {

    var contact = new Contact({ Id: 12 });

    var response = {
      d: {
        Id: 12,
        CreatedBy: 'John Doe',
        __metadata: {
          etag: 'W8'
        }
      }
    };

    $.ajax = function (obj) {
      lastRequest = obj;
      obj.success(response, status, xhr)
    };


    contact.fetch();

    var update = {
      FirstName: 'Bill',
      JobTitle: 'Writer'
    };
    var update2 = _.clone(update);
    delete update2.JobTitle;

    contact.set(update);
    contact.unset('JobTitle');
    contact.save();

    deepEqual(contact.attributes, _.extend(response.d, update2))
    var data = JSON.parse(lastRequest.data);
    deepEqual(data, _.extend(update2));

  });

  test("Item: clear()", function () {

    var contact = new Contact({ Id: 12 });

    var metadata = {
      __metadata: {
        etag: 'W8'
      }
    };

    var response = {
      d: metadata
    };

    $.ajax = function (obj) {
      lastRequest = obj;
      obj.success(response, status, xhr)
    };

    contact.fetch();

    var update = {
      FirstName: 'Bill',
      JobTitle: 'Writer'
    };

    contact.set(update);
    contact.clear();
    contact.save();

    deepEqual(contact.attributes, metadata);
    var data = JSON.parse(lastRequest.data);
    deepEqual(data, {});

  });


  test("List: fetch()", function () {

    var response = {
      d: {
        results :[{
          Id: 12,
          CreatedBy: 'John Doe',
          __metadata: {
            etag: 'W8'
          }
        }]
      }
    };

    $.ajax = function (obj) {
      lastRequest = obj;
      obj.success(response, status, xhrWithoutEtag)
    };

    contacts.fetch();
    equal(lastRequest.url, '/teamsite/_vti_bin/ListData.svc/Contacts');
    equal(lastRequest.type, 'GET');
    equal(lastRequest.dataType, 'json');
    ok(lastRequest.processData);
    ok(_.isEmpty(lastRequest.data));


    // fetch with data
    contacts.fetch({ data: { a: 'a', one: 1} });
    equal(lastRequest.url, '/teamsite/_vti_bin/ListData.svc/Contacts');
    equal(lastRequest.data.a, 'a');
    equal(lastRequest.data.one, 1);


    //fetch with keywords
    contacts.fetch({ top: 50, skip: 100 });
    equal(lastRequest.data.$top, 50);
    equal(lastRequest.data.$skip, 100);

    contacts.fetch({ filter: 'Id eq 1' });
    equal(lastRequest.data.$filter, 'Id eq 1');

    contacts.fetch({ notAKeyword: 'abc' });
    ok(_.isUndefined(lastRequest.data.notAKeyword));

  });

  test("List: create()", function () {
    var attrs = {
      LastName: 'Faulkner',
      FirstName: 'William'
    };

    contacts.create(attrs);
    equal(lastRequest.url, '/teamsite/_vti_bin/ListData.svc/Contacts');
    equal(lastRequest.type, 'POST');
    equal(lastRequest.dataType, 'json');

    var data = JSON.parse(lastRequest.data);
    deepEqual(data, attrs);

  });









});
