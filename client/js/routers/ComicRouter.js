define( [ 'backbone' ], function( Backbone ) {
   return Backbone.Router.extend({
      routes: {
         "comic/:groupid/:id": "comic",
         "comic/:groupid/:id/:page": "comic",
         "list/:id": "list",
         "list": "list",
         "": "root",
         "*404": "notfound"
      }
   });
} );