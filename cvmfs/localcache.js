'use strict';

import { LocalStorage } from 'node-localstorage';

class Node {
    constructor(value) {
        this.value = value;
        this.next = null;
        this.prev = null;
    }
}

class LeastRecentlyUsed {
    constructor() {
        this.nodes = {};
        this.front = null;
        this.back = null;
    }

    popBack() {
        if (this.back === null) {
            return;
        }    
        const key_to_pop = this.back.value;
        this.nodes[key_to_pop] = undefined;
        this.back = this.back.next;
        if (this.back !== null) {
            this.back.prev = null;
        }    
        return key_to_pop;
    }

    pushFront(key) {
        let node = this.nodes[key];

        if (node === this.front) {
            return;
        } else if (node === undefined) {
            node = new Node(key);
            this.nodes[key] = node;
        } else {
            if (node.next !== null) {
                node.next.prev = node.prev;
            }
            if (node.prev !== null) {
                node.prev.next = node.next;
            }   
        }

        node.next = null;
        node.prev = this.front;
        this.front = node;
        
        if (this.back === null) {
            this.back = node;
        }
            
    }

    isEmpty() {
        return this.front === null;
    }

    reset() {
        this.nodes = {};
        this.front = null;
        this.back = null;
    }
}

export class Cache {
    constructor(){
        this.index = new LeastRecentlyUsed();
        this.localStorage = new LocalStorage('./cache', Number.MAX_VALUE); 
    }

    set(key, value) {
        const buffer = Buffer.from(value);

        let cached = false;
        while (!cached) {
            try {
                this.localStorage.setItem(key, value);
                this.index.pushFront(key);
                cached = true;
            } catch (e) {
                console.log('ERROR:', e);
                if (this.index.isEmpty()) {
                    cached = true;
                }
                else {
                    const poppedBack = this.index.popBack();
                    console.log('Removing key from cache: ', poppedBack)
                    this.localStorage.removeItem(poppedBack);
                }
            }
        }
    }

    get(key) {
        const base64 = this.localStorage.getItem(key);
    
        if (base64 === null) {
            return null;
        }
        this.index.pushFront(key);

        const buffer = Buffer.from(base64, 'base64');
        return buffer.toString('binary');
    }

    clearAll() {
        this.localStorage.clear();
        this.index.reset();
    }
}