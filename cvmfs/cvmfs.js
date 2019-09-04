import { Repository } from "./repo";
import { isURLvalid } from "./util"

export async function getJSONfromRpository(repositoryWebsite, repositoryName) {

    let repository = new Repository(repositoryWebsite, repositoryName);
    await repository.connect();

    const manifest = repository.getManifest();
    const metainfo = repository.getMetainfo();
    const whitelist = repository.getWhitelist();
    const metainfoJson = JSON.parse(metainfo)
    const repositoryRevision = repository.getRevision();
    const repositoryPublishedTimestamp = repository.getPublishedTimestamp();

    // console.log('------------------------------------------------------------------');
    // console.log(manifest);
    // console.log(manifest.rootHash);
    // console.log(whitelist);
    // console.log(repository.getCertificate());
    // console.log(metainfoJson);

    let newJson = {};
    let recommendedStratumOne = '';
    let revision = '';
    let stratumOne = [];
    let repositoryState = '';
    let healthStratumOne = '';
    let i = 1;
    let publishedTimestamp = '';
    let stratumOneAllRevision = [];
    let hashAlgorithm = '';
    
    for (const key of metainfoJson['recommended-stratum1s']) {
        
        recommendedStratumOne = key.replace(`/${repositoryName}`, '').trim();

        // Check if recommendedStratumOne is a valid URL
        if(! isURLvalid(recommendedStratumOne)) {
            throw new Error(`Stratum 1 URL is invalid: '${recommendedStratumOne}'`);
        }

        const stratumOneRepository = new Repository(recommendedStratumOne, repositoryName)

        await stratumOneRepository.connect();

        revision = stratumOneRepository.getRevision();
        publishedTimestamp = stratumOneRepository.getPublishedTimestamp();
        // Assign state of repository
        if (repositoryRevision === revision) {
            repositoryState = 'green';
        } else if (repositoryRevision === revision + 1) {
            repositoryState = 'yellow';
        } else if (repositoryRevision !== revision) {
            repositoryState = 'red';
        };

        const metainfoForStratumOne = stratumOneRepository.getMetainfoForStratumOne();
        const metainfoForStratumOneJson = JSON.parse(metainfoForStratumOne)

        stratumOne.push({
            url: stratumOneRepository._baseURL,
            revision: revision,
            health: repositoryState,
            id: i++,
            publishedTimestamp: publishedTimestamp,
            name: metainfoForStratumOneJson.organisation,
            location: ''
        });

        stratumOneAllRevision.push(revision);

        // Chceck revisoin for all stratumOne repositoris
        if (stratumOne.find(x => x.health.includes('red'))) {
            healthStratumOne = 'red';
        } else if (stratumOne.find(x => x.health.includes('yellow') && !x.health.includes('red'))) {
            healthStratumOne = 'yellow';
        } else if (stratumOne.find(x => x.health.includes('green') && !x.health.includes('yellow') && !x.health.includes('red'))) {
            healthStratumOne = 'green';
        }
        // Check algorithm
        if (manifest.rootHash.includes("rmd160")) {
            hashAlgorithm = "rmd160";
        } else if (manifest.rootHash.includes("shake128")) {
            hashAlgorithm = "shake128";
        } else {
            hashAlgorithm = "SHA1";
        }
        // Create json for frontend application
        newJson.administrator = metainfoJson.administrator;
        newJson.email = metainfoJson.email;
        newJson.organisation = metainfoJson.organisation;
        newJson.description = metainfoJson.description;
        newJson.url = metainfoJson.url;
        newJson.recommendedStratum0 = {
            url: metainfoJson['recommended-stratum0'],
            revision: repositoryRevision,
            publishedTimestamp: repositoryPublishedTimestamp
        };
        newJson.recommendedStratum1s = stratumOne;
        newJson.custom = metainfoJson.custom;
        newJson.health = healthStratumOne;
        newJson.oldestRevisionStratumOne = Math.min(...stratumOneAllRevision);
        newJson.whitelistExpiryDate = whitelist.expiryDate;
        newJson.download = {
            catalog: repository.catalogURL,
            certificate: repository.certificateURL,
            manifest: repository.manifestURL,
            whitelist: repository.whitelistURL,
            metainfo: repository.metainfoURL
        };
        // newJson.rootHash = manifest.rootHash; 
        // newJson.hashAlgorithm = hashAlgorithm; 
        newJson.rootHash = manifest.catalogHash.downloadHandle;
        newJson.hashAlgorithm = manifest.catalogHash.algorithm;
    };
    return newJson;
}
