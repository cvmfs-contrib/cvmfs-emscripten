'use strict';

import {KEYUTIL, BigInteger } from 'jsrsasign';

export class KeyManager {
  constructor(){
    this._pkcs8Keys = [
      /* emscripten.cvmfs.io */
      '-----BEGIN PUBLIC KEY-----\
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5ZQxnVi11Pe0gZFXTYjn\
      dWHNMZmpMt51C9WjKIIpP4xGWpddWgCjjnIIeGyeqAlHgXB7UiQ6v6m6qN3+JLzB\
      lnpV+Vk6U6bis1qJtH8ffhqwfPoJvfszze0/AnZlVm5e0PcicCLOc10ndFScq/Uy\
      z6avFicgrQNNayIyT6bIP/grldh8U5nc4nKf8F0aGTtIa6he0qb5h0fxBcjCCD2h\
      aEbkq4jfGZ1KXwu9tqJSLEz1mCa10DYN1yLNe2qPDv5hdZ2hiLNZEYFmWwi/RT54\
      FiKZ4IagLdkzywFoSoQtIBG/kfz6k5SIs/dCySiSjKwp/xW7Bvmr3Fvm8EZm8rQ7\
      ZQIDAQAB\
      -----END PUBLIC KEY-----'
    ];
    this._masterKeys = this._pkcs8Keys.map((pkcs_key) => KEYUTIL.getKey(pkcs_key));    
  }

  getMasterKeys() {
    return this._masterKeys;
  }
 
  addMasterKey(pkcs_key) {
    this.master_keys.push(KEYUTIL.getKey(pkcs_key));
  };

  verifyRawWithMessageHex(key, sMsgHex, hSig) {
    hSig = hSig.replace(/[^0-9a-f]/gi, '');
    hSig = hSig.replace(/[ \n]+/g, "");
    
    const biSig = new BigInteger(hSig, 16);

    console.log('biSig.bitLength()', biSig.bitLength());
    console.log('key.n.bitLength()', key.n.bitLength());

    if (biSig.bitLength() > key.n.bitLength()) { 
      console.log('hSig as BigInteger has more bits than the master key');
      return 0;
    } 
    
    // TODO: Make sure we have access to the doPublic function
    var biDecryptedSig = key.doPublic(biSig);
    var hMsgHex = biDecryptedSig.toString(16).replace(/^1f+00/, '');
    return hMsgHex === sMsgHex;
  }
}