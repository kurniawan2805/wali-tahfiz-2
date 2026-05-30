'use strict';

// Use the platform's native DOMException
module.exports = globalThis.DOMException || global.DOMException;
