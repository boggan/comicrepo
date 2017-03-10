define( ['backbone', '../models/ComicPageModel' ], function( Backbone, ComicPageModel ) {
   return Backbone.Collection.extend({
      model: ComicPageModel,

      //=======================================================================
      initialize: function(models, options) {
         if( options.parent )
            this.parent = options.parent;
      },

      //=======================================================================
      sync: function(method, model, options) {
         switch( method ) {
            case "create":
               break;
            case "read":
               // only for read here, should I remove the rest ?
               break;
            case "update":
               break;
            case "delete":
               break;
         }
      }
   });
} );