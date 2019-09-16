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
      -----END PUBLIC KEY-----',

      /*  egi.eu */
      '-----BEGIN PUBLIC KEY-----\
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQGYXTp9cRcMbGeDoijB\
      gKNTCEpIWB7XcqIHVXJjfxEkycQXMyZkB7O0CvV3UmmY2K7CQqTnd9ddcApn7BqQ\
      /7QGP0H1jfXLfqVdwnhyjIHxmV2x8GIHRHFA0wE+DadQwoi1G0k0SNxOVS5qbdeV\
      yiyKsoU4JSqy5l2tK3K/RJE4htSruPCrRCK3xcN5nBeZK5gZd+/ufPIG+hd78kjQ\
      Dy3YQXwmEPm7kAZwIsEbMa0PNkp85IDkdR1GpvRvDMCRmUaRHrQUPBwPIjs0akL+\
      qoTxJs9k6quV0g3Wd8z65s/k5mEZ+AnHHI0+0CL3y80wnuLSBYmw05YBtKyoa1Fb\
      FQIDAQAB\
      -----END PUBLIC KEY-----',

      /* opensiencegrid.org */

      '-----BEGIN PUBLIC KEY-----\
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxKhc7s1HmmPWH4Cq1U3K\
      4FNFKcMQgZxUrgQEfvgkF97OZ8I8wzC9MWqmegX6tqlPmAzYWTM+Xi4nEBWYRhd+\
      hVN/prHyYGzb/kTyCSHa9EQtIk9SUyoPfQxkGRnx68pD5con8KJySNa8neplsXx+\
      2gypwjasBRQLzB3BrrGhrzZ5fL84+dsxNBBW6QfNO1BS5ATeWl3g1J27f0GoGtRO\
      YbPhaAd9D+B+qVo9pt3jKXvjTZQG0pE16xaX1elciFT9OhtZGaErDJyURskD7g3/\
      NotcpBL5K5v95zA/kh5u+TRrmeTxHyDOpyrGrkqRaT5p+/C1z0HDyKFQbptegCbn\
      GwIDAQAB\
      -----END PUBLIC KEY-----',

      '-----BEGIN PUBLIC KEY-----\
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqFzLLZAg2xmHJLbbq0+N\
      eYtjRDghUK5mYhARndnC3skFVowDTiqJVc9dIDX5zuxQ9HyC0iKM1HbvN64IH/Uf\
      qoXLyZLiXbFwpg6BtEJxwhijdZCiCC5PC//Bb7zSFIVZvWjndujr6ejaY6kx3+jI\
      sU1HSJ66pqorj+D1fbZCziLcWbS1GzceZ7aTYYPUdGZF1CgjBK5uKrEAoBsPgjWo\
      +YOEkjskY7swfhUzkCe0YyMyAaS0gsWgYrY2ebrpauFFqKxveKWjDVBTGcwDhiBX\
      60inUgD6CJXhUpvGHfU8V7Bv6l7dmyzhq/Bk2kRC92TIvxfaHRmS7nuknUY0hW6t\
      2QIDAQAB\
      -----END PUBLIC KEY-----',

      '-----BEGIN PUBLIC KEY-----\
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzlAraXimfJP5ie0KtDAE\
      rNUU5d9bzst+kqfhnb0U0OUtmCIbsueaDlbMmTdRSHMr+T0jI8i9CZxJwtxDqll+\
      UuB3Li2hYBhk0tYTy29JJYvofVULvrw1kMSLKyTWnV30/MHjYxhLHoZWfdepTjVg\
      lM0rP58K10wR3Z/AaaikOcy4z6P/MHs9ES1jdZqEBQEmmzKw5nf7pfU2QuVWJrKP\
      wZ9XeYDzipVbMc1zaLEK0slE+bm2ge/Myvuj/rpYKT+6qzbasQg62abGFuOrjgKI\
      X4/BVnilkhUfH6ssRKw4yehlKG1M5KJje2+y+iVvLbfoaw3g1Sjrf4p3Gq+ul7AC\
      PwIDAQAB\
      -----END PUBLIC KEY-----',
      
      /* DESY */
      
      '-----BEGIN PUBLIC KEY-----\
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3pgrEIimdCPWG9cuhQ0d\
      ZWfYxvHRz5hL4HvQlmvikLIlHxs2EApnGyAWdaHAeQ4IiY+JXQnGsS8e5Gr2cZRb\
      Y6Ya19GrjMY1wv8fc+uU9kXp7TbHpl3mSQxERG4+wqosN3+IUaPHdnWGP11idOQB\
      I0HsJ7PTRk9quFjx1ppkVITZN07+OdGBIzLK6SyDjy49IfL6DVZUH/Oc99IiXg6E\
      NDN2UecnnjDEmcvQh2UjGSQ+0NHe36ttQKEnK58GvcSj2reUEaVKLRvPcrzT9o7c\
      ugxcbkBGB3VfqSgfun8urekGEHx+vTNwu8rufBkAbQYdYCPBD3AGqSg+Kgi7i/gX\
      cwIDAQAB\
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