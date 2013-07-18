(function (Backbone, _, $) {

    // SharePoint ListData service
    var LIST_SERVICE = '_vti_bin/Lists.asmx',
        url,
        getChanges,
        getSuccessMethod,
        SoapClient,

        methodMap = {
            'create': { name: 'UpdateListItems', updateCmd: 'New' },
            'update': { name: 'UpdateListItems', updateCmd: 'Update' },
            'delete': { name: 'UpdateListItems', updateCmd: 'Delete' },
            'read': { name: 'GetListItems' }
        },

        templates = {
            commandTemplate:
                '<?xml version="1.0" encoding="utf-8"?>' +
                '<soap:Envelope ' +
                '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
                '  xmlns:xsd="http://www.w3.org/2001/XMLSchema" ' +
                '  xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
                '<soap:Body>' +
                '<<%= method %> xmlns="http://schemas.microsoft.com/sharepoint/soap/">' +
                '<%= params %>' +
                '</<%= method %>>' +
                '</soap:Body>' +
                '</soap:Envelope>',

            updateItemTemplate:
                '<Batch OnError="Continue">' +
                '<Method ID="1" Cmd="<%= command %>">' +
                    '<% _.each(fields, function(field, index) { %>' +
                    '<Field Name="<%= field.name %>"><%= field.value %></Field>' +
                    '<% }); %>' +
                '</Method>' +
                '</Batch>',

            getItemById:
                '<Query><Where><Eq><FieldRef Name="ID" /><Value Type="Counter">' +
                '<%= id %>' +
                '</Value></Eq></Where></Query>'
        },

        compiledTemplates = {};

    // calculate url based on site
    url = function (options) {
        var site = options.site,
        // remove leading and trailing forward slashes from the site path
            path = site.replace(/^\/+|\/+$/g, ''),
            url = (path ? '/' + path : '') + '/' + LIST_SERVICE;

        return url;
    };

    getChanges = function (model, method) {
        if (model.isNew()) {
            return _.map(model.attributes, function(value, key) {
                return { name: key, value: value };
            });
        }
        var requiredFields = [{ name: 'ID', value: model.get('ID') }];

        var changedFields = _.map(model.changedAttributes(), function (value, key) {
            return { name: key, value: value };
        });

        // it's required to pass FileRef to delete items from document library
        if (method === 'delete') {
            var fileRef = model.get('FileRef');
            if (fileRef) {
                var tokens = fileRef.split(';#');
                var fileRefValue = tokens.length > 1 ? tokens[1] : fileRef;
                requiredFields.push({ name: 'FileRef', value: fileRefValue });
            }
        }
        return _.flatten([requiredFields, changedFields]);
    };

    SoapClient = {
        template: function( key) {
            if (compiledTemplates[key])
                return compiledTemplates[key];

            // copy templateSettings in case someone modified them
            var tmplSettings = _.templateSettings;
            _.templateSettings = {
                evaluate    : /<%([\s\S]+?)%>/g,
                interpolate : /<%=([\s\S]+?)%>/g,
                escape      : /<%-([\s\S]+?)%>/g
            };

            var templateString = templates[key];
            if (templateString) {
                compiledTemplates[key] = _.template(templateString);
            }
            // restore templateSettings
            _.templateSettings = tmplSettings;
            return compiledTemplates[key];
        },

        serializeParams: function (params) {
            var key, value, xml = '';

            params = params || {};

            if (typeof params === 'string') {
                return params;
            }

            for (key in params) {
                value = params[key];
                if (typeof value !== 'undefined' && value !== null) {
                    xml += '<' + key + '>' + value + '</' + key + '>';
                }
            }
            return xml;
        },

        // string that contains information for the next page request
        // if there is no ListItemCollectionPositionNext - it means that we reached last page
        parsePagingInfo: function (data) {
            var rootnode,
                licp;

            rootnode = $(data).find('*').filter(function () {
                return this.nodeName === 'rs:data';
            })[0];
            if (!rootnode)
                return null;

            licp = _.findWhere(rootnode.attributes, { name: 'ListItemCollectionPositionNext' });
            return licp ? licp.value : null;
        },

        // results will an Array of javascript objects.
        parseResultsXml: function (data) {
            var nodes, name,
                NODE_ELEMENT = 1,
                results = [], result;

            nodes = $(data).find('*').filter(function () {
                return this.nodeName === 'z:row';
            });

            if (nodes.length === 0)
                return null;

            nodes.each(function () {
                // skip text nodes
                if (this.nodeType === NODE_ELEMENT) {
                    result = {};
                    _.each(this.attributes, function(attribute) {
                        name = attribute.name.replace('ows_', '');
                        result[name] = attribute.value;
                    });
                    // only use the result if it is not hidden
                    if ((result.Hidden || '').toUpperCase() !== 'TRUE') {
                        results.push(result);
                    }
                }
            });

            return results;
        },

        call: function (config) {
            config = config || {};

            var method = methodMap[config.method];

            // prepare the Ajax request
            var request = {
                type: 'POST',
                url: url({ site: config.site }),
                contentType: 'text/xml',
                dataType: 'xml',
                data: this.template('commandTemplate')({
                    method: method.name,
                    params: this.serializeParams(config.params)
                }),
                processData: false,
                success: config.options.success,
                headers: {
                    'SOAPAction': 'http://schemas.microsoft.com/sharepoint/soap/' + method.name
                },
                error: config.options.error
            };

            // Make the request.
            return $.ajax(request);
        }
    };

    getSuccessMethod = function (model, options, getDataCallback) {
        var oldSuccess = options.success,
            success = function(resp, status, xhr) {
                var data = null;
                if (getDataCallback && _.isFunction(getDataCallback))
                    data = getDataCallback(resp, status, xhr);
                if (oldSuccess) {
                    if (Backbone.VERSION === '0.9.9' || Backbone.VERSION === '0.9.10') {
                        oldSuccess(model, data, options);
                    } else {
                        oldSuccess(data, status, xhr);
                    }
                }
            };

        return success;
    };

    Backbone.SP = Backbone.SP || {};

    Backbone.SP.SoapItem = Backbone.Model.extend({
        idAttribute: 'ID',

        url: function () {
            return url({ site: this.site });
        },

        sync: function (method, model, options) {
            options = options ? _.clone(options) : {};
            options.params = options.params || {};
            if (method === 'read') {
                // viewName is mandatory parameter
                options.params.viewName = model.view || '';
                options.params.query = SoapClient.template('getItemById')(this);
                options.params.queryOptions = '<QueryOptions><ViewAttributes Scope="Recursive" /></QueryOptions>';
            }
            // otherwise we have create/update/delete
            else {
                var fields = getChanges(model, method);
                var updates = SoapClient.template('updateItemTemplate')({
                    fields: fields,
                    command: methodMap[method].updateCmd
                });
                options.params.updates = updates;
            }

            options.success = getSuccessMethod(model, options, function (resp, status, xhr) {
                var data = null;
                if (method === 'read' || method === 'create') {
                    data = SoapClient.parseResultsXml(resp);
                    // get first item if we fetch single model
                    data = data.length > 0 ? data[0] : data;
                }
                return data;
            });

            SoapClient.call({
                site: model.site,
                method: method,
                options: options,
                params: _.extend({
                    listName: model.list
                }, options.params)
            });
        }
    });

    Backbone.SP.SoapList = Backbone.Collection.extend({
        url: function () {
            if (this.model && this.model.prototype.site && this.model.prototype.url) {
                return this.model.prototype.url();
            }
            // otherwise use site and list settings of this collection
            return url({ site: this.site });
        },

        pagingInfo: null,

        sync: function (method, collection, options) {
            options = options ? _.clone(options) : {};
            options.params = options.params || {};
            if (method === 'read') {
                // viewName is mandatory parameter
                options.params.viewName = collection.view || '';
            }
            options.success = getSuccessMethod(collection, options, function (resp, status, xhr) {
                var data = null;
                options.params = options.params || {};
                if (method === 'read') {
                    data = SoapClient.parseResultsXml(resp);
                    collection.pagingInfo = SoapClient.parsePagingInfo(resp);
                }
                return data;
            });
            SoapClient.call({
                site: collection.site || collection.model.prototype.site,
                method: method,
                options: options,
                params: _.extend({
                    listName: collection.list || collection.model.prototype.list
                }, options.params)
            });
        }
    });
} (Backbone, _, jQuery));
