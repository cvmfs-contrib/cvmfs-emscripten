import { Repository } from "./repo";
import express from 'express';
const fs = require('fs');
// TODO: Deprecated
// const cvmfs = {
//   retriever: {},
//   cache: {},
//   util: {},
// };

const app = express();

// TODO: Promise -> then chain
const repositoryWebsite = 'http://cvmfs-stratum-one.cern.ch/cvmfs';
const repositoryName = 'atlas.cern.ch';
// const repositoryName = 'atlas-nightlies.cern.ch';
// const repositoryName = 'alice-ocdb.cern.ch';
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
    // console.log(metainfoJson);
    // console.log(metainfoJson.administrator);

    let newJson = {};
    let recommendedStratumOne = '';
    let revision = '';
    let stratumOne = [];
    let repositoryState = '';
    let healthStratumOne = '';

    for (const key of metainfoJson['recommended-stratum1s']){
        recommendedStratumOne = key.replace(`/${repositoryName}`, '').trim();
        const stratumOneRepository = new Repository(recommendedStratumOne, repositoryName);
            stratumOneRepository.connect().then(() => {
                revision = stratumOneRepository.getRevision();
                // Assign state of repository
                if(repositoryRevision === revision) {
                    repositoryState = 'green';
                } else if (repositoryRevision === revision + 1) {
                    repositoryState = 'yellow';
                } else if (repositoryRevision !== revision) {
                    repositoryState = 'red';
                };

                stratumOne.push({
                    url: recommendedStratumOne,
                    revision: revision,
                    health : repositoryState,
                });

                // Chceck revisoin for all stratumOne repositoris
                if (stratumOne.find(x => x.health.includes('red'))) {
                    healthStratumOne = 'red';
                } else if (stratumOne.find(x => x.health.includes('yellow') && !x.health.includes('red'))) {
                    healthStratumOne = 'yellow';
                } else if (stratumOne.find(x => x.health.includes('green') && !x.health.includes('yellow') && !x.health.includes('red'))){
                    healthStratumOne = 'green';
                }
                
            }).then(() => {
                newJson.administrator = metainfoJson.administrator;
                newJson.email = metainfoJson.email;
                newJson.organisation = metainfoJson.organisation;
                newJson.description = metainfoJson.description;
                newJson.url = metainfoJson.url;
                newJson.recommendedStratum0 = {
                    url: metainfoJson['recommended-stratum0'],
                    revision: repositoryRevision
                };
                newJson.recommendedStratum1 = stratumOne;
                newJson.custom = metainfoJson.custom;
                newJson.health = healthStratumOne;

                let jsonStr = JSON.stringify(newJson);

                fs.writeFile('metainfofile.json', jsonStr, 'utf8', (err) => {
                    if(err) {
                        console.log(err);
                    };
                    console.log("File has been created");
                });
                console.log("newJson", newJson);
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