cvmfs.cache.lru = {
    nodes: {},
    front: null,
    back: null,
    popBack: function() {
        if (this.back === null)
            return;

        const key_to_pop = this.back.key;
        this.nodes[key_to_pop] = undefined;
        this.back = this.back.next;
        if (this.back !== null)
            this.back.prev = null;
        return key_to_pop;
    },
    pushFront: function(key) {
        let node = this.nodes[key];

        if (node === this.front)
            return;

        if (node !== undefined) {
            if (node.next !== null)
                node.next.prev = node.prev;
            if (node.prev !== null)
                node.prev.next = node.next;
        } else {
            node = { key: key };
            this.nodes[key] = node;
        }

        node.next = null;
        node.prev = this.front;
        this.front = node;
        if (this.back === null)
            this.back = node;
    },
    isEmpty: function() {
        return this.front === null;
    }
};

cvmfs.cache.set = function(key, val_str) {
	if (this.text_encoder === undefined)
		this.text_encoder = new TextEncoder();

	const buffer = this.text_encoder.encode(val_str);

	const base64 = this.bufferToString(buffer);

    let cached = false;
    while (!cached) {
        try {
            localStorage.setItem(key, base64);
            this.lru.pushFront(key);
            cached = true;
        } catch (e) {
            if (this.lru.isEmpty())
                cached = true;
            else
                localStorage.removeItem(this.lru.popBack());
        }
    }
};

cvmfs.cache.get = function(key) {
	const base64 = localStorage.getItem(key);
	if (base64 === null)
		return null;

    cvmfs.cache.lru.pushFront(key);

	if (this.text_decoder === undefined)
		this.text_decoder = new TextDecoder();

    const buffer = this.stringToBuffer(base64);
    return this.text_decoder.decode(buffer);
};

cvmfs.cache.clearAll = function() {
    localStorage.clear();
    this.nodes = {};
    this.front = null;
    this.back = null;
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
