cvmfs.cache.localstorage_chunk_limit = 1024 * 1024;

cvmfs.cache.set = function(key_str, val_str) {
	if (val_str.length > this.localstorage_chunk_limit)
		return;

	if (this.text_encoder === undefined)
		this.text_encoder = new TextEncoder();
	const buffer = this.text_encoder.encode(val_str);

	const base64 = this.bufferToString(buffer);

	try {
		localStorage.setItem(key_str, base64);
	} catch (e) {
		console.log(e);
	}
};

cvmfs.cache.get = function(key_str) {
	const base64 = localStorage.getItem(key_str);
	if (base64 === null)
		return null;

	const buffer = this.stringToBuffer(base64);

	if (this.text_decoder === undefined)
		this.text_decoder = new TextDecoder();
    return this.text_decoder.decode(buffer);
};

/// ----
/// taken from https://github.com/localForage/localForage
/// License: https://github.com/localForage/localForage/blob/master/LICENSE

cvmfs.cache.BASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

cvmfs.cache.bufferToString = function(buffer) {
    var bytes = new Uint8Array(buffer);
    var base64String = '';
    var i;

    var BASE_CHARS = cvmfs.cache.BASE_CHARS;
    for (i = 0; i < bytes.length; i += 3) {
        base64String += BASE_CHARS[bytes[i] >> 2];
        base64String += BASE_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
        base64String +=
            BASE_CHARS[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
        base64String += BASE_CHARS[bytes[i + 2] & 63];
    }

    if (bytes.length % 3 === 2) {
        base64String = base64String.substring(0, base64String.length - 1) + '=';
    } else if (bytes.length % 3 === 1) {
        base64String =
            base64String.substring(0, base64String.length - 2) + '==';
    }

    return base64String;
}

cvmfs.cache.stringToBuffer = function(serializedString) {
    var bufferLength = serializedString.length * 0.75;
    var len = serializedString.length;
    var i;
    var p = 0;
    var encoded1, encoded2, encoded3, encoded4;

    if (serializedString[serializedString.length - 1] === '=') {
        bufferLength--;
        if (serializedString[serializedString.length - 2] === '=') {
            bufferLength--;
        }
    }

    var buffer = new ArrayBuffer(bufferLength);
    var bytes = new Uint8Array(buffer);

    var BASE_CHARS = cvmfs.cache.BASE_CHARS;
    for (i = 0; i < len; i += 4) {
        encoded1 = BASE_CHARS.indexOf(serializedString[i]);
        encoded2 = BASE_CHARS.indexOf(serializedString[i + 1]);
        encoded3 = BASE_CHARS.indexOf(serializedString[i + 2]);
        encoded4 = BASE_CHARS.indexOf(serializedString[i + 3]);

        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
    return buffer;
}

// ----
