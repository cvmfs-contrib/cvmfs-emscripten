'use strict';

import { KEYUTIL, BigInteger } from 'jsrsasign';

export class KeyManager {
  constructor() {
    this._pkcs8Keys = [
      /* The newest key for atlas.cern.ch*/
      '-----BEGIN PUBLIC KEY-----\
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAukBusmYyFW8KJxVMmeCj\
      N7vcU1mERMpDhPTa5PgFROSViiwbUsbtpP9CvfxB/KU1gggdbtWOTZVTQqA3b+p8\
      g5Vve3/rdnN5ZEquxeEfIG6iEZta9Zei5mZMeuK+DPdyjtvN1wP0982ppbZzKRBu\
      BbzR4YdrwwWXXNZH65zZuUISDJB4my4XRoVclrN5aGVz4PjmIZFlOJ+ytKsMlegW\
      SNDwZO9z/YtBFil/Ca8FJhRPFMKdvxK+ezgq+OQWAerVNX7fArMC+4Ya5pF3ASr6\
      3mlvIsBpejCUBygV4N2pxIcPJu/ZDaikmVvdPTNOTZlIFMf4zIP/YHegQSJmOyVp\
      HQIDAQAB\
      -----END PUBLIC KEY-----',

      /* emscripten.cvmfs.io */
      '-----BEGIN PUBLIC KEY-----\
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5ZQxnVi11Pe0gZFXTYjn\
      dWHNMZmpMt51C9WjKIIpP4xGWpddWgCjjnIIeGyeqAlHgXB7UiQ6v6m6qN3+JLzB\
      lnpV+Vk6U6bis1qJtH8ffhqwfPoJvfszze0/AnZlVm5e0PcicCLOc10ndFScq/Uy\
      z6avFicgrQNNayIyT6bIP/grldh8U5nc4nKf8F0aGTtIa6he0qb5h0fxBcjCCD2h\
      aEbkq4jfGZ1KXwu9tqJSLEz1mCa10DYN1yLNe2qPDv5hdZ2hiLNZEYFmWwi/RT54\
      FiKZ4IagLdkzywFoSoQtIBG/kfz6k5SIs/dCySiSjKwp/xW7Bvmr3Fvm8EZm8rQ7\
      ZQIDAQAB\
      -----END PUBLIC KEY-----',

      /* propably depricated key atlas.cern.ch and others / cern-it1.cern.ch */
      '-----BEGIN PUBLIC KEY-----\
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAo8uKvscgW7FNxzb65Uhm\
      yr8jPJiyrl2kVzb/hhgdfN14C0tCbfFoE6ciuZFg+9ytLeiL9pzM96gSC+atIFl4\
      7wTgtAFO1W4PtDQBwA/IG2bnwvNrzk19ob0JYhjZlS9tYKeh7TKCub55+vMwcEbP\
      urzo3WSNCzJngiGMh1vM5iSlGLpCdSGzdwxLGwc1VjRM7q3KAd7M7TJCynKqXZPX\
      R2xiD6I/p4xv39AnwphCFSmDh0MWE1WeeNHIiiveikvvN+l8d/ZNASIDhKNCsz6o\
      aFDsGXvjGy7dg43YzjSSYSFGUnONtl5Fe6y4bQZj1LEPbeInW334MAbMwYF4LKma\
      yQIDAQAB\
      -----END PUBLIC KEY-----'
    ];
    this._masterKeys = this._pkcs8Keys.map((pkcs_key) => KEYUTIL.getKey(pkcs_key));
  }

  getMasterKeys() {
    return this._masterKeys;
  }

  addMasterKey(pkcs_key) {
    this._masterKeys.push(KEYUTIL.getKey(pkcs_key));
  };

  verifyRawWithMessageHex(key, sMsgHex, hSig) {
    hSig = hSig.replace(/[^0-9a-f]/gi, ''); 
    hSig = hSig.replace(/[ \n]+/g, "");

    const biSig = new BigInteger(hSig, 16);

    if (biSig.bitLength() > key.n.bitLength()) {
      console.log('hSig as BigInteger has more bits than the master key');
      return 0;
    }

    const biDecryptedSig = key.doPublic(biSig);
    const hMsgHex = biDecryptedSig.toString(16).replace(/^1f+00/, '');

    return (hMsgHex == sMsgHex);
  }
}