define( [ 'backbone', '../collections/ComicCollection' ], function( Backbone, ComicCollection ) {
   return Backbone.Model.extend({
      //=======================================================================
      initialize: function(options) {
         // page model related code here ? -- or use generic model
         // have collection of comics here ?!
      },

      //=======================================================================
      parse: function( i_oModel ) {
         i_oModel.comics = new ComicCollection( i_oModel.comics, { groupId: i_oModel._id } );
         return i_oModel;
      }
   });
} );