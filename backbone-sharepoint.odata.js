/******************************************************************
*  Backbone.SharePoint OData proxy 
* 
*  Author: Luc Stakenborg
*  Date: Mar 2, 2012
* 
*  Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php 
*  Copyright (c) 2012, Luc Stakenborg, Oxida B.V.
******************************************************************
*/


(function (Backbone, _, $) {

    // SharePoint ListData service
    var LISTDATA_SERVICE = '_vti_bin/ListData.svc',
        url;

    // calculate url based on site, list and (optional) id
    url = function (options) {
        var site = options.site,
            list = options.list,
            id = options.id,

            // remove leading and trailing forward slashes from the site path
            path = site.replace(/^\/+|\/+$/g, ''),
            url = (path ? '/' + path : '') + '/' + LISTDATA_SERVICE + '/' + list +
                    (id ? '(' + encodeURIComponent(id) + ')' : '');

        return url;
    };


    Backbone.SP = {};

    Backbone.SP.Item = Backbone.Model.extend({

        // the id attribute of a SharePoint item. Please note capital I
        idAttribute: 'Id',

        // the SharePoint site on the current server. By default: root
        site: '',

        initialize: function () {
            this._changeSet = {};
            this.bind('change', this._updateChangeSet);
        },

        _updateChangeSet: function () {
            _.extend(this._changeSet, this.changedAttributes());
        },

        url: function () {

            var options = {
                site: this.site,
                list: this.list
            };

            if (!this.isNew()) {
                options.id = this.id;
            }

            return url(options);
        },

        unset: function (attr, options) {
            var result = Backbone.Model.prototype.unset.call(this, attr, options);
            if (result) {
                delete this._changeSet[attr];
            }
            return result;
        },

        clear: function (attr, options) {
            var result = Backbone.Model.prototype.clear.call(this, attr, options);

            if (result) {
                this._changeSet = {};
            }
            return result;
        },



        sync: function (method, model, options) {
            var metadata = model.get("__metadata"),
                methodMap = {
                    'create': 'POST',
                    'update': 'POST',  // OData requires MERGE for partial updates and DELETE
                    'delete': 'POST', // Tunneling through POST to support older browser like e.g. IE7/IE8
                    'read': 'GET'
                },

                type = methodMap[method],


                // Default JSON-request options.
                params = _.extend({
                    type: type,
                    dataType: 'json',
                    processData: (type === 'GET')
                }, options),

                success = params.success;

            // Ensure that we have a URL.
            if (!params.url) {
                params.url = model.url();
            }

            // Ensure that we have the appropriate request data.
            if (!params.data && model && (method === 'create' || method === 'update')) {
                params.contentType = 'application/json';

                if (method === 'create') {
                    params.data = JSON.stringify(model.toJSON());
                }

                // See http://www.odata.org/developers/protocols/operations#MethodTunnelingthroughPOST 3.2
                if (method === 'delete' || method === 'update') {
                    params.headers = {
                        'X-HTTP-Method' : method
                    };
                }

                if (method === 'update') {
                    params.data = JSON.stringify(model._changeSet || {});
                    params.headers = {
                        'If-Match': metadata ? metadata.etag : '*'
                    };
                }

            }

            // transfer special url parameters like select and 
            // orderby to the params.data hash
            if (method === 'read') {
                params.data = params.data || {};
                _(['filter', 'select', 'orderby',
                    'top', 'skip', 'expand',
                    'inlinecount'])
                    .each(function (keyword) {
                        if (options[keyword]) {
                            params.data['$' + keyword] = options[keyword];
                        }
                    });

            }


            // Create a success handler to: 
            // (1) clear the _changeSet after successful sync with server
            // (2) set etag
            // (3) normalize the response, so a model.fetch() does not require a parse()
            params.success = function (resp, status, xhr) {
                // first process the response ...
                if (success) {
                    // OData responds with an updated Etag
                    var etag = xhr.getResponseHeader('Etag');

                    // Instead of passing resp, we'll pass resp.d
                    // This way we don't need to override the model.parse() method
                    success(resp.d, status, xhr);

                    if (etag) {
                        // Backbone doesn't support setting/getting nested attributes
                        // Updating etag attribute directly instead
                        model.attributes.__metadata.etag = etag;
                    }
                }
                // ..then empty the _changeSet
                model._changeSet = {};
            };

            // Make the request.
            return $.ajax(params);
        }

    });

    Backbone.SP.List = Backbone.Collection.extend({
        url: function () {

            // use the Model's url method, if available
            if (this.model) { return this.model.prototype.url(); }

            // otherwise use site and list settings of this collection
            return url({ site: this.site, list: this.list });

        },

        sync: function (method, model, options) {
            return this.model.prototype.sync(method, model, options);
        },

        parse: function (response) {

            if (response.__count) {
                this._count = parseInt(response.__count, 10);
            } else {
                delete this._count;
            }

            return response.results;
        }



    });


} (Backbone, _, $));

