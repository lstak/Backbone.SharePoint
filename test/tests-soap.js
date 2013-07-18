$(document).ready(function () {


  // don't reorder tests
  QUnit.config.reorder = false;

  var Item = Backbone.SP.SoapItem,
      List = Backbone.SP.SoapList,
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
      contacts = new Contacts();

      xhr = {
        getResponseHeader: function (headerName) {
          if (headerName == 'Etag') return "W-updated";

          return "Unknown";

        }
      };

      xhrWithoutEtag = {
        getResponseHeader: function (headerName) {
          if (headerName == 'Etag') return null;

          return "Unknown";

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
    };

    contact.set(update);
    deepEqual(contact.attributes, _.extend(attrs, update));

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
    contact = new (Item.extend({ site: '/' }));
    equal(contact.url(), '/_vti_bin/Lists.asmx');

    // try empty site, should resolve to root
    contact = new (Item.extend({ site: '' }));
    equal(contact.url(), '/_vti_bin/Lists.asmx');

    // try subsite
    contact = new (Item.extend({ site: '/teamsite' }));
    equal(contact.url(), '/teamsite/_vti_bin/Lists.asmx');

    // try subsite without leading slash
    contact = new (Item.extend({ site: 'teamsite' }));
    equal(contact.url(), '/teamsite/_vti_bin/Lists.asmx');

    // try subsite with trailing slash
    contact = new (Item.extend({ site: '/teamsite/' }));
    equal(contact.url(), '/teamsite/_vti_bin/Lists.asmx')

    // try subsite 3 levels deep with trailing slash
    contact = new (Item.extend({ site: '/sub1/sub2/sub3' }));
    equal(contact.url(), '/sub1/sub2/sub3/_vti_bin/Lists.asmx');

  });


  test("Item: fetch()", function () {
    var attrs = { ID: 12 };

    // faked response from server
    var response = $.parseXML('<listitems xmlns:s="uuid:BDC6E3F0-6DA3-11d1-A2A3-00AA00C14882"' +
                              ' xmlns:dt="uuid:C2F41010-65B3-11d1-A29F-00AA00C14882"' +
                              ' xmlns:rs="urn:schemas-microsoft-com:rowset" xmlns:z="#RowsetSchema" xmlns="http://schemas.microsoft.com/sharepoint/soap/">' +
                              '<rs:data ItemCount="1"><z:row ows_ID="12" ows_FirstName="William" ows_LastName="Faulkner" /></rs:data></listitems>');

    $.ajax = function (obj) {
      lastRequest = obj;
      obj.success.call(obj.context, response, status, xhr);
    };

    var contact = new Contact(attrs);
    deepEqual(contact.attributes, attrs);

    contact.fetch();

    equal(lastRequest.data, '<?xml version="1.0" encoding="utf-8"?>' +
          '<soap:Envelope   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
          '   xmlns:xsd="http://www.w3.org/2001/XMLSchema"   xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
          '<soap:Body><GetListItems xmlns="http://schemas.microsoft.com/sharepoint/soap/">' +
          '<listName>Contacts</listName><viewName></viewName><query><Query><Where><Eq><FieldRef Name="ID" />' +
          '<Value Type="Counter">12</Value></Eq></Where></Query></query>' +
          '<queryOptions><QueryOptions><ViewAttributes Scope="Recursive" /></QueryOptions></queryOptions>' +
          '</GetListItems></soap:Body></soap:Envelope>');
    equal(lastRequest.url, '/teamsite/_vti_bin/Lists.asmx');
    equal(lastRequest.type, 'POST');
    equal(lastRequest.dataType, 'xml');

    // request data should not be empty
    ok(!_.isEmpty(lastRequest.data));

    var expectedAttrs = {
      ID: '12',
      FirstName: 'William',
      LastName: 'Faulkner'
    };

    // response should be parsed into model
    deepEqual(contact.attributes, expectedAttrs);
  });



  test("Item: save()", function () {

    var attrs = {
      LastName: 'Faulkner',
      FirstName: 'William'
    };
    var contact = new Contact(attrs);

    var response = $.parseXML('<?xml version="1.0" encoding="utf-8"?>' +
                              '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"' +
                              ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
                              '<soap:Body><UpdateListItemsResponse xmlns="http://schemas.microsoft.com/sharepoint/soap/">' +
                              '<UpdateListItemsResult><Results><Result ID="1,New"><ErrorCode>0x00000000</ErrorCode><ID />' +
                              '<z:row ows_ID="6" ows_FirstName="William" ows_LastName="Faulkner" ows_Modified="2013-04-30 12:45:33" ' +
                              'ows_Created="2013-04-30 12:45:33"  xmlns:z="#RowsetSchema" /></Result></Results></UpdateListItemsResult></UpdateListItemsResponse>' +
                              '</soap:Body></soap:Envelope>');

    $.ajax = function (obj) {
      lastRequest = obj;
      obj.success(response, status, xhr);
    };

    ok(contact.isNew());

    contact.save();
    ok(!lastRequest.processData);
    ok(!contact.isNew());
    equal(lastRequest.url, '/teamsite/_vti_bin/Lists.asmx');
    equal(lastRequest.type, 'POST');
    equal(lastRequest.dataType, 'xml');

    var expectedAttrs = {
      ID: '6',
      FirstName: 'William',
      LastName: 'Faulkner'
    };
    // server response should be parsed into model
    deepEqual(_.pick(contact.attributes, _.keys(expectedAttrs)), expectedAttrs);
  });


  test("Item: destroy()", function () {
    var contact = new Contact({ ID: 12 });

    contact.destroy();

    equal(lastRequest.url, '/teamsite/_vti_bin/Lists.asmx');
    equal(lastRequest.type, 'POST');
    equal(lastRequest.dataType, 'xml');

    // request data should be empty
    equal(lastRequest.data, '<?xml version="1.0" encoding="utf-8"?>' +
          '<soap:Envelope   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"   xmlns:xsd="http://www.w3.org/2001/XMLSchema"' +
          '   xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' +
          '<UpdateListItems xmlns="http://schemas.microsoft.com/sharepoint/soap/"><listName>Contacts</listName>' +
          '<updates><Batch OnError="Continue"><Method ID="1" Cmd="Delete">' +
          '<Field Name="ID">12</Field></Method></Batch></updates></UpdateListItems></soap:Body></soap:Envelope>');

  });

  test("Item: save() - updates", function () {

    var attrs = {
      LastName: 'Faulkner',
      FirstName: 'William'
    };


    var response = $.parseXML('<?xml version="1.0" encoding="utf-8"?>' +
                              '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"' +
                              ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
                              '<soap:Body><UpdateListItemsResponse xmlns="http://schemas.microsoft.com/sharepoint/soap/">' +
                              '<UpdateListItemsResult><Results><Result ID="1,New"><ErrorCode>0x00000000</ErrorCode><ID />' +
                              '<z:row ows_ID="6" ows_FirstName="William" ows_LastName="Faulkner" ows_Modified="2013-04-30 12:45:33" ' +
                              'ows_Created="2013-04-30 12:45:33"  xmlns:z="#RowsetSchema" /></Result></Results></UpdateListItemsResult></UpdateListItemsResponse>' +
                              '</soap:Body></soap:Envelope>');

    $.ajax = function (obj) {
      lastRequest = obj;
      obj.success(response, status, xhr);
    };

    var contact = new Contact(attrs);
    ok(contact.isNew());

    // first save
    contact.save();

    ok(!contact.isNew());

    var update = {
      FirstName: 'Bill',
      JobTitle: 'Writer'
    };

    contact.set(update);
    contact.save();
    deepEqual(_.pick(contact.attributes, _.keys(update)), update);

    equal(lastRequest.url, '/teamsite/_vti_bin/Lists.asmx');

    equal(lastRequest.dataType, 'xml');

    // test Method tunneling
    equal(lastRequest.type, 'POST');

    var update2 = {
      JobTitle: 'Writer2',
      Telephone: '+1-800-123495'
    };

    contact.save(update2);
    var expectedResult = _.extend({}, update, update2);
    deepEqual(_.pick(contact.attributes, _.keys(expectedResult)), expectedResult);
  });

  test("Item: save() - updates2", function () {

    var contact = new Contact({ ID: 12 });

    var response = $.parseXML('<?xml version="1.0" encoding="utf-8"?>' +
                              '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"' +
                              ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
                              '<soap:Body><UpdateListItemsResponse xmlns="http://schemas.microsoft.com/sharepoint/soap/">' +
                              '<UpdateListItemsResult><Results><Result ID="1,New"><ErrorCode>0x00000000</ErrorCode><ID />' +
                              '<z:row ows_ID="6" ows_FirstName="William" ows_LastName="Faulkner" ows_Modified="2013-04-30 12:45:33" ' +
                              'ows_Created="2013-04-30 12:45:33"  xmlns:z="#RowsetSchema" /></Result></Results></UpdateListItemsResult></UpdateListItemsResponse>' +
                              '</soap:Body></soap:Envelope>');

    $.ajax = function (obj) {
      lastRequest = obj;
      obj.success(response, status, xhr);
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

    var expectedResult = _.extend({}, update, update2);
    deepEqual(_.pick(contact.attributes, _.keys(expectedResult)), expectedResult);
  });


  test("Item: unset()", function () {

    var contact = new Contact({ ID: 12 });

    var response = $.parseXML('<?xml version="1.0" encoding="utf-8"?>' +
                              '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"' +
                              ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
                              '<soap:Body><UpdateListItemsResponse xmlns="http://schemas.microsoft.com/sharepoint/soap/">' +
                              '<UpdateListItemsResult><Results><Result ID="1,New"><ErrorCode>0x00000000</ErrorCode><ID />' +
                              '<z:row ows_ID="6" ows_FirstName="William" ows_LastName="Faulkner" ows_Modified="2013-04-30 12:45:33" ' +
                              'ows_Created="2013-04-30 12:45:33"  xmlns:z="#RowsetSchema" /></Result></Results></UpdateListItemsResult></UpdateListItemsResponse>' +
                              '</soap:Body></soap:Envelope>');

    $.ajax = function (obj) {
      lastRequest = obj;
      obj.success(response, status, xhr);
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

    deepEqual(_.pick(contact.attributes, _.keys(update2)), update2);
  });

  test("Item: clear()", function () {

    var contact = new Contact({ ID: 12 });

    var emptyObject = {};

    var response = $.parseXML('<?xml version="1.0" encoding="utf-8"?>' +
                              '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"' +
                              ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
                              '<soap:Body><UpdateListItemsResponse xmlns="http://schemas.microsoft.com/sharepoint/soap/">' +
                              '<UpdateListItemsResult><Results><Result ID="1,New"><ErrorCode>0x00000000</ErrorCode><ID />' +
                              '<z:row ows_ID="6" ows_FirstName="William" ows_LastName="Faulkner" ows_Modified="2013-04-30 12:45:33" ' +
                              'ows_Created="2013-04-30 12:45:33"  xmlns:z="#RowsetSchema" /></Result></Results></UpdateListItemsResult></UpdateListItemsResponse>' +
                              '</soap:Body></soap:Envelope>');

    $.ajax = function (obj) {
      lastRequest = obj;
      obj.success(response, status, xhr);
    };

    contact.fetch();

    var update = {
      FirstName: 'Bill',
      JobTitle: 'Writer'
    };

    contact.set(update);
    contact.clear();

    deepEqual(contact.attributes, emptyObject);
  });


  test("List: fetch()", function () {

    var response = $.parseXML('<listitems xmlns:s="uuid:BDC6E3F0-6DA3-11d1-A2A3-00AA00C14882"' +
                              ' xmlns:dt="uuid:C2F41010-65B3-11d1-A29F-00AA00C14882"' +
                              ' xmlns:rs="urn:schemas-microsoft-com:rowset" xmlns:z="#RowsetSchema" xmlns="http://schemas.microsoft.com/sharepoint/soap/">' +
                              '<rs:data ItemCount="2"><z:row ows_ID="11" ows_FirstName="William" ows_LastName="Faulkner" />' +
                              '<z:row ows_ID="12" ows_FirstName="Bill" ows_LastName="Writer" />' +
                              '</rs:data></listitems>');

    $.ajax = function (obj) {
      lastRequest = obj;
      obj.success(response, status, xhr);
    };

    contacts.fetch();
    equal(lastRequest.url, '/teamsite/_vti_bin/Lists.asmx');
    equal(lastRequest.type, 'POST');
    equal(contacts.length, 2);
    equal(lastRequest.dataType, 'xml');
    ok(!lastRequest.processData);
    ok(!_.isEmpty(lastRequest.data));


    // fetch with data
    var params = {
      query: '<IsNull><FieldRef Name="FirstName" /></IsNull>'
    };
    contacts.fetch({ params: params });
    equal(lastRequest.url, '/teamsite/_vti_bin/Lists.asmx');
    var result = $($.parseXML(lastRequest.data)).find('*').filter(function () {
      return this.nodeName === 'query';
    })[0];
    equal(result.childNodes[0].childNodes[0].attributes['Name'].value, 'FirstName');
    result = $($.parseXML(lastRequest.data)).find('*').filter(function () {
      return this.nodeName === 'viewName';
    })[0];

    ok(result);
    equal(result.childNodes.length, 0);

    params.paging = '<Paging ListItemCollectionPositionNext="Paged=TRUE&amp;p_FirstName=Bill&amp;p_ID=11" />';
    contacts.fetch({ params: params });
    result = $($.parseXML(lastRequest.data)).find('*').filter(function () {
      return this.nodeName === 'paging';
    })[0];

    equal(result.childNodes[0].attributes['ListItemCollectionPositionNext'].value, 'Paged=TRUE&p_FirstName=Bill&p_ID=11');

    params.viewFields = '<ViewFields><FieldRef Name="ID" /></ViewFields>';
    contacts.fetch({ params: params });
    result = $($.parseXML(lastRequest.data)).find('*').filter(function () {
      return this.nodeName === 'viewFields';
    })[0];

    equal(result.childNodes.length, 1);
    equal(result.childNodes[0].childNodes[0].attributes['Name'].value, 'ID');
  });

  test("List: create()", function () {
    var attrs = {
      LastName: 'Faulkner',
      FirstName: 'William'
    };

    contacts.create(attrs);
    equal(lastRequest.url, '/teamsite/_vti_bin/Lists.asmx');
    equal(lastRequest.type, 'POST');
    equal(lastRequest.dataType, 'xml');

    var dataXml = $.parseXML(lastRequest.data);
    var result = $(dataXml).find('*').filter(function () {
      return this.nodeName === 'listName';
    })[0];

    result = $(dataXml).find('*').filter(function () {
      return this.nodeName === 'Method';
    })[0];
    equal(result.attributes['Cmd'].value, 'New');
    equal(result.childNodes.length, 2);
  });
});
