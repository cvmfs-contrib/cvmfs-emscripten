import { getJSONfromRpository } from './cvmfs';
import express from 'express';

const bodyParser = require('body-parser');

const app = express();
// for parsing application/json
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//enable CORS
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods","GET");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Cache-Controle");
    next();
});

const port = 5000;
app.listen(port, () => `Server running on port ${port}`);

app.get('/api/details', async (req, res) => {
    let repositoryName = req.query.name;
    let repositoryWebsite = req.query.website

    try {
        console.log(`Fetching repository ${repositoryName} from ${repositoryWebsite}`);
        const reposonseJSON = await getJSONfromRpository(repositoryWebsite, repositoryName);
        // console.log("reposonseJSON",reposonseJSON)
        res.json(reposonseJSON);
    } catch (error) {
        console.log(error)
        res.status(404).send(error.message);
    }
});