
(function (Backbone, _, $) {

    // SharePoint ListData service
    var LIST_SERVICE = '_vti_bin/Lists.asmx',
        url,
        SoapClient;

    // calculate url based on site
    url = function (options) {
        var site = options.site,
        // remove leading and trailing forward slashes from the site path
            path = site.replace(/^\/+|\/+$/g, ''),
            url = (path ? '/' + path : '') + '/' + LIST_SERVICE;

        return url;
    };

    SoapClient = {
        tpl: _.template(
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
                '</soap:Envelope>'
        ),

        serializeParams: function (params) {
            var key, value, xml = '';

            params = params || {};

            for (key in params) {
                value = params[key];
                if (value) {
                    xml += '<' + key + '>';
                    switch (key) {
                        case 'viewFields':
                            // for future use...
                            break;
                        default:
                            xml += params[key];
                            break;
                    }

                    xml += '</' + key + '>';
                }
            }
            return xml;
        },

        success: function (data, status, xhr, callback) {
            var nodes, node, rootnode, name,
                NODE_ELEMENT = 1,
                attributes, attribute,
                results = [], result,
                root = 'data',
                i, j;


            rootnode = data.querySelector(root);
            nodes = rootnode.childNodes;

            for (i = 0; i < nodes.length; i += 1) {
                node = nodes[i];

                // skip text nodes
                if (node.nodeType === NODE_ELEMENT) {
                    attributes = node.attributes;
                    result = {};
                    for (j = 0; j < attributes.length; j += 1) {
                        attribute = attributes[j];
                        name = attribute.name.replace('ows_', '');
                        result[name] = attribute.value;
                    }
                    // only use the result if it is not hidden
                    if ((result.Hidden || '').toUpperCase() !== "TRUE") {
                        results.push(result);
                    }

                }
            }

            // results now contains an Array of javascript objects.

            // call the success handler inside Collection.fetch() to process the results.
            if (callback) {
                callback(results, status, xhr);
            }

        },


        call: function (config) {
            var me = this,
                request;


            config = config || {};

            // prepare the Ajax request
            request = {
                type: 'POST',
                url: url({ site: config.site }),
                contentType: 'text/xml',
                dataType: 'xml',
                data: this.tpl({
                    method: config.method,
                    params: this.serializeParams(config.params)
                }),
                processData: false,
                success: function (data, status, xhr) {
                    me.success(data, status, xhr, config.success)
                },
                error: config.error
            };

            // Make the request.
            return $.ajax(request);

        }


    };


    Backbone.SP = {};

    Backbone.SP.Item = Backbone.Model.extend({
        // to be implemented...
    });

    Backbone.SP.List = Backbone.Collection.extend({
        url: function () {
            // otherwise use site and list settings of this collection
            return url({ site: this.site });

        },

        sync: function (method, collection, options) {

            SoapClient.call({
                site: collection.site,
                service: 'Lists',
                method: 'GetListItems',
                success: options.success,
                error: options.error,
                params: {
                    listName: collection.list,
                    viewName: collection.view || ''
                }
            });


        }



    });


} (Backbone, _, $));

