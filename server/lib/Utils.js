var os = require("os"),
    fs = require("fs"),
    path = require("path"),
    crypto = require("crypto");

//=============================================================================
function cUtils() {

    //=============================================================================
    // Public Members
    //=============================================================================

    this.CONSTANTS = {
        RAR_EXT: ".cbr",
        ZIP_EXT: ".cbz"
    };

    //=============================================================================
    // Public methods
    //=============================================================================

    //=============================================================================
    this.reflectPromisedFunction = function(i_oFunction, i_aArguments) {
        var l_aOriginalArgs = Array.prototype.slice.call(i_aArguments),
            l_aCallArgs = l_aOriginalArgs.concat(); // create a copy

        return new Promise(function(i_oResolve) {
            l_aCallArgs.push(function() {
                var l_aCompletionArgs = Array.prototype.slice.call(arguments);
                l_aOriginalArgs = l_aOriginalArgs.concat(l_aCompletionArgs);
                i_oResolve(l_aOriginalArgs);
            });

            i_oFunction.apply(this, l_aCallArgs);
        });
    };

    //=============================================================================
    this.genRandomString = function(i_nNbBytes) {
        var l_nNbBytes = i_nNbBytes || 10;

        return crypto.randomBytes(l_nNbBytes).toString("hex");
    };

    //=============================================================================
    this.createTempDirectory = function(i_oCallback) {
        var l_sOSTempDir = os.tmpdir(),
            l_sTmpName = this.genRandomString(),
            l_sFullTmpPath = path.join(l_sOSTempDir, l_sTmpName);


        fs.mkdir(l_sFullTmpPath, 0777, function(err, i_sPath) {
            if (!err) {
                console.log("createTempDirectory::Temp dir created: ", err, l_sFullTmpPath);
            } else {
                console.log("createTempDirectory::Error creating tmp dir ", l_sFullTmpPath);
                l_sFullTmpPath = null;
            }

            i_oCallback(l_sFullTmpPath);
        });
    };
}

// export instance of utils
module.exports = new cUtils();
