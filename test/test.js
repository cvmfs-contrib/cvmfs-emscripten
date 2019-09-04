import { strictEqual, deepStrictEqual, ok } from 'assert';
import { KeyManager } from '../cvmfs/masterkeys';
import { KEYUTIL, BigInteger } from 'jsrsasign';
import { stringToHex, repoURL } from '../cvmfs/util';
import { Retriever } from "../cvmfs/retriever";

const atlasPublicKey = '-----BEGIN PUBLIC KEY-----\
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAukBusmYyFW8KJxVMmeCj\
N7vcU1mERMpDhPTa5PgFROSViiwbUsbtpP9CvfxB/KU1gggdbtWOTZVTQqA3b+p8\
g5Vve3/rdnN5ZEquxeEfIG6iEZta9Zei5mZMeuK+DPdyjtvN1wP0982ppbZzKRBu\
BbzR4YdrwwWXXNZH65zZuUISDJB4my4XRoVclrN5aGVz4PjmIZFlOJ+ytKsMlegW\
SNDwZO9z/YtBFil/Ca8FJhRPFMKdvxK+ezgq+OQWAerVNX7fArMC+4Ya5pF3ASr6\
3mlvIsBpejCUBygV4N2pxIcPJu/ZDaikmVvdPTNOTZlIFMf4zIP/YHegQSJmOyVp\
HQIDAQAB\
-----END PUBLIC KEY-----';

function oldStringToHex(input) {
    const len = input.length;
    const hex = new Array(len);
    for (var i = 0; i < len; i++) {
        const byte = input.charCodeAt(i) & 0xff;
        hex[i] = ('0' + byte.toString(16)).slice(-2);
    }
    return hex.join('');retriever
}

function newStringToHex(input) {
    const buffer = Buffer.from(input, 'binary');
    return buffer.toString('hex');
}

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

describe('jsrsasign', function () {

    const signature = '0a62dc30fc6f5cd304d6ac7629c4f708f2414e5a314a42386284d8dd043afbe28cdd145160f620cec25e0d916ff13a6b31d39a654c98d7dd21bef187fe5f841b944622273c6851d4d006c3f467280ac38f82192548ea2295a8d53c77b468fe53b743c06852dde3fac4f8e4b391f163a95c2f2e837075a82415fed3b27c9b90dc6e74a8dcde7c182d6609c028c7fa43df03c3959a4f0fb93dec63651977397660f3d9f9afbbeb7dab66efd732315294a629c791d4177ca8b1468aa92e4c12aaaf5c51737426907b47b0dbb3a9bc5a803e2f9edcd16e49b6a4bf18b9af17bc2a0392da816be95270247f8b58c31ecfc5058d6cdb21a9b55ce73cec53b312bdc187';
    const signatureBigInteger = new BigInteger(signature, 16);

    const atlasKey = KEYUTIL.getKey(atlasPublicKey);
    const decryptedDoPublic = atlasKey.doPublic(signatureBigInteger);
    const decryptedModPowInt = signatureBigInteger.modPowInt(atlasKey.e, atlasKey.n);

    describe('doPublic', function () {
        it('deepStrictEqual - doPublic function returns correct value', function () {
            deepStrictEqual(decryptedDoPublic, decryptedModPowInt);
        });
    });

    describe('bitLength', function(){
        it('bitLength of signature as BigInteger is less or equal to the bit length of the key', function () {
            ok(signatureBigInteger.bitLength() <= atlasKey.n.bitLength());
        });
    });

    const decryptedDoPublicHex = decryptedDoPublic.toString(16).replace(/^1f+00/, '');

    const metadataHashDownloadHandle = 'cf8ca7d2bade25ca150075fbc8b5c50ddf507274';
    const downloadHandleHex = stringToHex(metadataHashDownloadHandle);

    describe('calculateHex', function () {
        it('calculateHex - verifyRawWithMessageHex works as expected with the given input', function () {
            deepStrictEqual(decryptedDoPublicHex, downloadHandleHex);
        });
    });
});

describe('stringToHex', function () {
    const input = 'cf8ca7d2bade25ca150075fbc8b5c50ddf507274';
    
    describe('stringToHex', function () {
        it('oldString of calculation is deepStrictEqual with newString', function () {

            const oldString = oldStringToHex(input);
            const newString = newStringToHex(input);

            deepStrictEqual(oldString, newString);
        });
    });

    describe('binary stringToHex',  function() {
        it('oldBinary of calculation string is deepStrictEqual with newBinary', async () => {

            const baseURL = 'http://cvmfs-stratum-one.cern.ch/cvmfs';
            const repoName = 'atlas.cern.ch';
            const url = repoURL(baseURL, repoName);

            const retriever = new Retriever();
            const manifestRaw = await retriever.download(url + '/.cvmfspublished');

            let signature = manifestRaw.substr(manifestRaw.search('--') + 3 /*(--\n)*/);
            signature = signature.substr(signature.search('\n') + 1 /*\n*/);

            const oldBinary = oldStringToHex(signature);
            const newBinary = newStringToHex(signature);

            deepStrictEqual(oldBinary, newBinary);
        });
    });
});
