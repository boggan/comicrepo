define( ['backbone', 'tpl!templates/comicCollectionItem.html' ], function( Backbone, ComicCollectionItemTemplate ) {
   return Backbone.View.extend({
      tagName: "li",
      className: "comic-item",
      events: {
         'click': 'comicClicked'
      },

      //=======================================================================
      initialize: function(options) {
      },

      //=======================================================================
      render: function() {
         this.$el.html( ComicCollectionItemTemplate(this.model) );
         return this;
      },

      //=======================================================================
      comicClicked: function(i_oEvent) {
         console.log( "Comic Clicked: ", this.model.get( "_id" ) );
         Backbone.Events.trigger("view-comic", this.model);
      }
   });
} );