define(['backbone', 'tpl!templates/comicLoad.html'],
    function(Backbone, ComicLoadTemplate) {
        return Backbone.View.extend({
            className: "comic-load",
            events: {},

            //=======================================================================
            initialize: function(options) {
                this.listenTo(this.model, "change:loadProgress", this.updateProgress, this);
            },

            //=======================================================================
            render: function() {
                this.$el.html(ComicLoadTemplate(this.model));
                return this;
            },

            //=======================================================================
            updateProgress: function() {
                // var l_sPrefix = this.model.get( 'loadType' ) === "download" ? "Downloading archive: " : "Extracting archive: ";
                var l_sPrefix = "Loading pages: ",
                    l_sSuffix = '%',
                    l_sContent = "";

                this.$('#load-progress').css({
                    width: [this.model.get('loadProgress'), '%'].join('')
                });

                if (this.model.get('loadProgress')) {
                    l_sContent = l_sPrefix + this.model.get( 'loadProgress' ) + '%';
                }

                this.$('#progress-value').html(l_sContent);
            }
        });
    });
