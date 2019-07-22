import { Repository, ENTRY_TYPE, CHUNK_HASH_ALG, COMPRESSION_ALG } from "./repo";

// TODO: Deprecated
// const cvmfs = {
//   retriever: {},
//   cache: {},
//   util: {},
// };

// TODO: Promise -> then chain
const repository = new Repository('http://cvmfs-stratum-one.cern.ch/cvmfs', 'atlas.cern.ch');
repository.connect().then(() => {
    console.log('------------------------------------------------------------------');
    console.log(repository.getManifest());
    console.log(repository.getWhitelist());
    console.log(repository.getCertificate());
    console.log('------------------------------------------------------------------');

    repository.getCatalog(manifest.catalogHash).then((catalog) => {
        const statistics = repository.getCatalogStats(catalog);
        console.log(statistics);
    });
});


