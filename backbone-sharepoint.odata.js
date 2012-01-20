
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

        parse: function (response) {
            return (response ? response.d : null);
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
                    'update': 'MERGE',  // OData requires MERGE for partial updates
                    'delete': 'DELETE',
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

            // create a success handler to: 
            // clear the _changeSet after successful sync with server


            params.success = function (resp, status, xhr) {
                // first process the response ...
                if (success) {
                    // OData responds with an updated Etag
                    var etag = xhr.getResponseHeader('Etag');
                    success(resp, status, xhr);
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

            if (response.d.__count) {
                this._count = parseInt(response.d.__count, 10);
            } else {
                delete this._count;
            }

            return response.d.results;
        }



    });


}(Backbone, _, $));

