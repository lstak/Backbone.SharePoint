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
            var changedAttributes = this.changedAttributes();

            // if attributes are set due to server response, the response will contain __metadata
            if (changedAttributes.__metadata) {
                this._changeSet = {};
            } else {
                _.extend(this._changeSet, this.changedAttributes());
            }

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

                    // OData requires MERGE for partial updates
                    // We will use Method tunneling throug POST because
                    // MERGE isn't supported by IE7 + IE8
                    'update': 'POST',

                    'delete': 'DELETE',
                    'read': 'GET'
                },

                type = methodMap[method],

            // Default JSON-request options.
                params = _.extend({
                    type: type,
                    dataType: 'json',
                    processData: (type === 'GET')
                }, options);

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

                if (method === 'update') {
                    params.data = JSON.stringify(model._changeSet || {});
                    params.headers = {
                        // header required for Method tunneling
                        'X-HTTP-Method': 'MERGE',

                        // header required for concurrency control
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
            // (1) set etag
            // (2) normalize the response, so a model.fetch() does not require a parse()
            var success = options.success;
            params.success = function (resp, status, xhr) {

                // OData responds with an updated Etag
                var etag = xhr.getResponseHeader('Etag');

                // always clear changeSet after a server response
                model._changeSet = {};

                // Instead of passing resp, we'll pass resp.d
                // make sure we cover 204 response (resp is empty) on Delete and Update
                // This way we don't need to override the model.parse() method
                if (success) {
                    if (Backbone.VERSION === '0.9.9' || Backbone.VERSION === '0.9.10') {
                        success(model, resp && resp.d, options);
                    } else {
                        success(resp && resp.d, status, xhr);
                    }
                }

                if (etag) {
                    // Backbone doesn't support setting/getting nested attributes
                    // Updating etag attribute directly instead
                    model.attributes.__metadata.etag = etag;
                }

            };

            var error = options.error;
            params.error = function (xhr, status, errorText) {
                if (error) {
                    // Include the error text in xhr so it's available to the callback
                    if (errorText) {
                        xhr.errorText = errorText;
                    }
                    error(model, xhr, options);
                }
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

} (Backbone, _, jQuery));
