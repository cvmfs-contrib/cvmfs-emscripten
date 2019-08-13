import { Repository } from "./repo";

// TODO: Deprecated
// const cvmfs = {
//   retriever: {},
//   cache: {},
//   util: {},
// };

// TODO: Promise -> then chain
const repositoryWebsite = 'http://cvmfs-stratum-one.cern.ch/cvmfs';
const repositoryName = 'atlas.cern.ch';
const repository = new Repository(repositoryWebsite, repositoryName);

repository.connect().then(() => {
    const manifest = repository.getManifest();
    const metainfo = repository.getMetainfo();
    const metainfoJson = JSON.parse(metainfo)
    const repositoryRevision = repository.getRevision();

    console.log('------------------------------------------------------------------');
    console.log(manifest);
    console.log(repository.getWhitelist());
    console.log(repository.getCertificate());
    console.log(metainfoJson);
    // console.log(metainfoJson['recommended-stratum0']);
    // console.log(metainfoJson['recommended-stratum1s']);

    for (const key of metainfoJson['recommended-stratum1s']){
        const recommendedStratumOne = key.replace(`/${repositoryName}`, '').trim();
        const stratumOneRepository = new Repository(recommendedStratumOne, repositoryName);
            stratumOneRepository.connect().then(() => {
                const revision = stratumOneRepository.getRevision();
                if(repositoryRevision !== revision) {
                    console.log(`!!!!Please update ${recommendedStratumOne}`);
                } else{
                    console.log(`Stratum 0 revision ${revision} is equal to Stratum 1 ${recommendedStratumOne} ${repositoryRevision}`);
                }
            });    
    };
    console.log('------------------------------------------------------------------');
    
    // repository.getCatalog(manifest.catalogHash).then((catalog) => {
    //     const statistics = repository.getCatalogStats(catalog);
    //     console.log(statistics);
    // });
});