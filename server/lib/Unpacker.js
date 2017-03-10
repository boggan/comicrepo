/*
 * Name: Unpacker
 * Description: Class used to unpack archives
 * Author: Thomas Lanteigne
 * Date: 17 Oct 2015
 */

var path = require("path"),
    fs = require("fs"),
    unzip = require('unzip'), // for zip compression (.CBZ)
    unrar = require('unrar'), // for Rar compression( .CBR )
    Utils = require('./Utils');

function cUnpacker() {
    //=============================================================================
    // Public methods
    //=============================================================================
    this.unpack = function(i_sFilePath, i_sOutputDirectory, i_oCallback) {
        console.log("unpacker::unpack::Unpacking ", i_sFilePath, " -> ", i_sOutputDirectory);

        // make sure output directory exists
        fs.mkdir(i_sOutputDirectory, function() {
            // arguments -- is necessary if the pathname contains spaces
            var l_sFileFolder = path.basename(i_sFilePath).replace(/\.[a-z]+$/i, ""),
                l_sUnpackDir = [i_sOutputDirectory, l_sFileFolder].join('/');

            // make sure output directory exists
            fs.mkdir(l_sUnpackDir, function() {
                _unpack(i_sFilePath, l_sUnpackDir, i_oCallback);
            });
        });
    };

    //=============================================================================
    // Private methods
    //=============================================================================
    function _unpack(i_sFilePath, i_sOutputDirectory, i_oCallback) {

        _detectFileType(i_sFilePath, function(i_sFileType) {
            if (i_sFileType === m_oFileTypes.ZIP) {
                console.log("Unpacker::unpack::using unzip... ");
                _unzip(i_sFilePath, i_sOutputDirectory, i_oCallback);
            } else if (i_sFileType === m_oFileTypes.RAR) {
                console.log("Unpacker::unpack::using unrar... ");
                _unrar(i_sFilePath, i_sOutputDirectory, i_oCallback);
            } else {
                console.log("Unpacker::unpack::INVALID ARCHIVE EXTENSION", i_sFilePath);
                i_oCallback(null);
            }
        });
    }

    //=============================================================================
    function _detectFileType(i_sFilePath, i_oCallback) {
        var l_oReadBuffer = new Buffer(m_nBytesToRead);
        fs.open(i_sFilePath, "r", function(i_oError, i_nFileDescriptor) {
            if (i_oError) {
                console.error("Unpacker::_detectFileType::Error opening file file ", i_sFilePath, " Error: ", i_oError);
                i_oCallback(m_oFileTypes.UNKNOWN);
            } else {
                fs.read(i_nFileDescriptor, l_oReadBuffer, 0, m_nBytesToRead, 0, function(i_oError) {
                    if (i_oError) {
                        console.error("Unpacker::_detectFileType::Error reading file ", i_oError);
                    }
                    fs.close(i_nFileDescriptor, function() {
                        // done, analyse buffer
                        i_oCallback(_findHeaderInBuffer(l_oReadBuffer));
                    });
                });
            }
        });
    }

    //=============================================================================
    function _findHeaderInBuffer(i_oBuffer) {
        var l_sFileType,
            l_bFound;

        for (l_sFileType in m_oFileHeaders) {
            l_bFound = m_oFileHeaders[l_sFileType].every(function(i_nByte, i_nIdx) {
                return i_oBuffer[i_nIdx] === i_nByte;
            });

            if (l_bFound) {
                break;
            }
        }

        if (!l_bFound) {
            l_sFileType = m_oFileTypes.UNKNOWN;
        }

        return l_sFileType;
    }

    //=============================================================================
    function _unzip(i_sFilePath, i_sOutputDirectory, i_oCallback) {
        var l_oUnzipParser,
            l_aExtractedFiles = [];

        console.log("Unpacker::_unzip::Unzipping file ", i_sFilePath);

        l_oUnzipParser = unzip.Parse();
        fs.createReadStream(i_sFilePath).pipe(l_oUnzipParser);

        l_oUnzipParser.on('error', function(err) {
            console.log("Unpacker::_unzip::Error Detected: ", err, " for comic : ", i_sFilePath);
            // throw err;
            i_oCallback([]);
        });

        // find another lib to extract just the initial file ?
        l_oUnzipParser.on('entry', function(i_oEntry) {
            // check entry type for File only ?
            if (i_oEntry.type === "File") {
                _unzipEntry(i_oEntry, i_sOutputDirectory, function(i_sExtractedFile) {
                    l_aExtractedFiles.push(i_sExtractedFile);
                    i_oEntry.autodrain();
                });
            } else {
                i_oEntry.autodrain();
            }
        });

        l_oUnzipParser.on('close', function() {
            console.error("Unpacker::_unzip::Extraction completed for file ", i_sFilePath);
            i_oCallback(l_aExtractedFiles);
        });
    }

    //=============================================================================
    function _unzipEntry(i_oEntry, i_sOutputDirectory, i_oCallback) {
        var l_sOutputFile,
            l_oWriteStream;

        l_sOutputFile = [i_sOutputDirectory, path.basename(i_oEntry.path)].join('/');
        l_oWriteStream = fs.createWriteStream(l_sOutputFile);

        // This is here incase any errors occur
        l_oWriteStream.on('error', function(err) {
            console.log("Unpacker::_unzipEntry::Error occured while unzipping entry, ", err);
        });

        i_oEntry.pipe(l_oWriteStream);
        l_oWriteStream.on('finish', function(err) {
            // console.log("Unpacker::_unzipEntry::Extracting entry ", l_sOutputFile);
            i_oCallback(l_sOutputFile);
        });
    }

    //=============================================================================
    function _unrar(i_sFilePath, i_sOutputDirectory, i_oCallback) {
        var l_oRarFile = new unrar({
            path: i_sFilePath,
            arguments: ["--"]
        });

        console.log("Unpacker::_unrar::Rar File : ", i_sFilePath, " -> ", i_sOutputDirectory);
        l_oRarFile.list(function(err, i_aEntries) {
            var i,
                l_aPromises = [];

            if (err) {
                console.error("Unpacker::_unrar::Error listing files for ", i_sFilePath, " Error: ", err, i_aEntries);
                i_oCallback([]);
            } else {

                for (i = 0; i < i_aEntries.length; i++) {
                    /// console.error("Unpacker::_unrar::Extracting file ", i_aEntries[i].name, " from ", i_sFilePath);
                    l_aPromises.push(_unrarEntry_Promised(l_oRarFile, i_sOutputDirectory, i_aEntries[i]));
                }

                Promise.all(l_aPromises).then(i_oCallback);
            }
        });
    }

    //=============================================================================
    function _unrarEntry_Promised(i_oRarFile, i_sOutputDirectory, i_oEntry) {
        return new Promise(function(i_oResolve) {
            _unrarEntry(i_oRarFile, i_sOutputDirectory, i_oEntry, i_oResolve);
        });
    }

    //=============================================================================
    function _unrarEntry(i_oRarFile, i_sOutputDirectory, i_oEntry, i_oCallback) {
        var l_sFilePath,
            l_sEntryName,
            l_oStream;

        l_sEntryName = i_oEntry.name;
        l_sFilePath = [i_sOutputDirectory, path.basename(l_sEntryName)].join('/');

        // console.log("Unpacker::_unrarEntry::Extracting  -> ", l_sEntryName, " to ", l_sFilePath);

        l_oStream = i_oRarFile.stream(l_sEntryName); // name of entry
        l_oStream.on('error', function(err) {
            console.error("Unpacker::_unrarEntry::Streaming error -> ", err);
        });
        l_oStream.pipe(fs.createWriteStream(l_sFilePath));

        l_oStream.on('close', function() {
            // console.log("Unpacker::_unrarEntry::Stream closed...");
            i_oCallback(l_sFilePath);
        });
    }

    //=============================================================================
    // Private members
    //=============================================================================
    var m_oFileHeaders = { // magic numbers
            RAR: [
                0x52,
                0x61,
                0x72,
                0x21,
                0x1a,
                0x07
            ],
            ZIP: [
                0x50,
                0x4b,
                0x03,
                0x04
            ]
        },
        m_oFileTypes = {
            ZIP: "ZIP",
            RAR: "RAR",
            UNKNOWN: "UNKNOWN"
        },
        m_nBytesToRead = 6; // make sure to have more or equal to the max bytes for magic numbers
}

module.exports = new cUnpacker();
