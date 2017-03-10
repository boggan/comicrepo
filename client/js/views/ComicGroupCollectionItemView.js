define( ['backbone', 'tpl!templates/comicGroupCollectionItem.html' ], function( Backbone, ComicGroupCollectionItemTemplate ) {
   return Backbone.View.extend({
      tagName: "li",
      className: "comic-group-item",
      events: {
         'click': 'groupClicked'
      },

      //=======================================================================
      initialize: function(options) {
      },

      //=======================================================================
      render: function() {
         this.$el.html( ComicGroupCollectionItemTemplate(this.model) );
         return this;
      },

      //=======================================================================
      groupClicked: function(i_oEvent) {
         console.log( "Comic Group Clicked: ", this.model.get( "_id" ) );
         // pass collection directly ?
         Backbone.Events.trigger( "view-group", this.model );
         return false;
      }
   });
} );