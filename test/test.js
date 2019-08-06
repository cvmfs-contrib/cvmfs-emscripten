import { strictEqual, ok } from 'assert';
import { KeyManager } from '../cvmfs/masterkeys';

const atlasPublicKey = '-----BEGIN PUBLIC KEY-----\
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAukBusmYyFW8KJxVMmeCj\
N7vcU1mERMpDhPTa5PgFROSViiwbUsbtpP9CvfxB/KU1gggdbtWOTZVTQqA3b+p8\
g5Vve3/rdnN5ZEquxeEfIG6iEZta9Zei5mZMeuK+DPdyjtvN1wP0982ppbZzKRBu\
BbzR4YdrwwWXXNZH65zZuUISDJB4my4XRoVclrN5aGVz4PjmIZFlOJ+ytKsMlegW\
SNDwZO9z/YtBFil/Ca8FJhRPFMKdvxK+ezgq+OQWAerVNX7fArMC+4Ya5pF3ASr6\
3mlvIsBpejCUBygV4N2pxIcPJu/ZDaikmVvdPTNOTZlIFMf4zIP/YHegQSJmOyVp\
HQIDAQAB\
-----END PUBLIC KEY-----';

describe('masterkeys', function () {
    const keyManager = new KeyManager();

    describe('getMasterKeys()', function () {
        it('MasterKeys is an Array', function () {
            ok(Array.isArray(keyManager.getMasterKeys()));
        });
    });

    describe('addMasterKey()', function () {
        it('MasterKeys increases internal masterkey list', function () {
            const lengthBefore = keyManager.getMasterKeys().length;
            keyManager.addMasterKey(atlasPublicKey);
            const lengthAfter = keyManager.getMasterKeys().length;
            strictEqual(lengthBefore + 1, lengthAfter);
        });
    });
});
