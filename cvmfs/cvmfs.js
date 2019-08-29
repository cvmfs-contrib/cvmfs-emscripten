import { Repository } from "./repo";
import express from 'express';
// const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
// for parsing application/json
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: false }));

//enable CORS
 app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
 });

// TODO: Promise -> then chain
// http://cvmfs-stratum-one.cern.ch/cvmfs/cms.cern.ch
let repositoryWebsite = 'http://cvmfs-stratum-one.cern.ch/cvmfs';
let repositoryName = 'atlas.cern.ch';
// const repositoryName = 'atlas-nightlies.cern.ch';
// const repositoryName = 'alice-ocdb.cern.ch';

app.post('/api/details', (req, res) => {
    repositoryName = req.body.name;
    repositoryWebsite = req.body.website
    console.log("repositoryName", repositoryName);
    console.log("repositoryWebsite", repositoryWebsite);
});

const repository = new Repository(repositoryWebsite, repositoryName);

repository.connect().then(() => {
    const manifest = repository.getManifest();
    const metainfo = repository.getMetainfo();
    const whitelist = repository.getWhitelist();
    const metainfoJson = JSON.parse(metainfo)
    const repositoryRevision = repository.getRevision();
    const repositoryPublishedTimestamp = repository.getPublishedTimestamp();

    console.log('------------------------------------------------------------------');
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

    for (const key of metainfoJson['recommended-stratum1s']){
        // console.log("key", key);
        recommendedStratumOne = key.replace(`/${repositoryName}`, '').trim();
        const stratumOneRepository = new Repository(recommendedStratumOne, repositoryName)
            // console.log("OUT recommendedStratumOne",recommendedStratumOne);
            
            stratumOneRepository.connect().then(() => {
                // console.log("IN stratumOneRepository", stratumOneRepository);
                // console.log("IN recommendedStratumOne",stratumOneRepository._baseURL);
                revision = stratumOneRepository.getRevision();
                publishedTimestamp = stratumOneRepository.getPublishedTimestamp();
                // Assign state of repository
                if(repositoryRevision === revision) {
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
                    health : repositoryState,
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
                } else if (stratumOne.find(x => x.health.includes('green') && !x.health.includes('yellow') && !x.health.includes('red'))){
                    healthStratumOne = 'green';
                }

                if(manifest.rootHash.includes("rmd160")){
                    hashAlgorithm = "rmd160";
                } else if (manifest.rootHash.includes("shake128")){
                    hashAlgorithm = "shake128";
                } else {
                    hashAlgorithm = "SHA1";
                }
                
            }).then(() => {
                newJson.administrator = metainfoJson.administrator;
                newJson.email = metainfoJson.email;
                newJson.organisation = metainfoJson.organisation;
                newJson.description = metainfoJson.description;
                newJson.url = metainfoJson.url;
                newJson.recommendedStratum0 = {
                    url: metainfoJson['recommended-stratum0'],
                    revision: repositoryRevision,
                    publishedTimestamp:repositoryPublishedTimestamp
                };
                newJson.recommendedStratum1s = stratumOne;
                newJson.custom = metainfoJson.custom;
                newJson.health = healthStratumOne;
                newJson.oldestRevisionStratumOne = Math.min(...stratumOneAllRevision);
                newJson.whitelistExpiryDate = whitelist.expiryDate;
                newJson.download = {
                    catalog: '',
                    certificate: '',
                    manifest: '',
                    whitelist: '',
                };
                newJson.rootHash = manifest.rootHash;
                newJson.hashAlgorithm = hashAlgorithm;

                console.log("stratumOneAllRevision", stratumOneAllRevision);

                let jsonStr = JSON.stringify(newJson);

                // fs.writeFile('metainfofile.json', jsonStr, 'utf8', (err) => {
                //     if(err) {
                //         console.log(err);
                //     };
                //     console.log("File has been created");
                // });
                // console.log("newJson", newJson);
            });        
    };

    app.get('/api', (req, res) => {
        const repositoryJson =  newJson;

        res.json(repositoryJson);
      });

      const port = 5000;
      
      app.listen(port, () => `Server running on port ${port}`);
    console.log('------------------------------------------------------------------');
});