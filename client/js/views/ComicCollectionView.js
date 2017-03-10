define( ['backbone', '../collections/ComicCollection', 'views/ComicCollectionItemView', 'tpl!templates/comicCollection.html' ],
        function( Backbone, ComicCollection, ComicCollectionItemView, ComicCollectionTemplate ) {
   return Backbone.View.extend({
      events: {
         'click .back-lnk': 'backClicked'
      },

      //=======================================================================
      initialize: function(options) {

         if( !options || !options.collection ) {
            this.collection = new ComicCollection( null, { groupId: options.groupId } );
            this.collection.fetch();
         }

         this.listenTo( this.collection, "reset", this.renderAll );
         this.listenTo( this.collection, "add", this.renderOne );
      },

      //=======================================================================
      render: function() {
         this.$el.html( ComicCollectionTemplate() );
         this.renderAll();
         return this;
      },

      //=======================================================================
      renderAll: function() {
         this.collection.each( this.renderOne, this );
      },

      //=======================================================================
      renderOne: function( i_oModel ) {
         console.log( "Model issue: ", i_oModel.get( "issue" ) );
         var l_oComicCollectionItem = new ComicCollectionItemView({ model: i_oModel });
         this.$('#list-container').append( l_oComicCollectionItem.render().el );
      },

      //=======================================================================
      backClicked: function() {
         console.log( "Back link clicked...." );
         Backbone.Events.trigger( 'view-list' );
         return false;
      }
   });
} );