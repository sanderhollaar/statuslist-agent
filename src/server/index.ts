import Debug from 'debug';
import express, { Express, Router } from 'express';
import morgan from 'morgan'
import cors, { CorsOptions } from 'cors'
//import { session, expressSession} from 'express-session'
import passport, { InitializeOptions } from 'passport'
import bodyParser from 'body-parser';
import { createHttpTerminator } from 'http-terminator'
import { getEnv } from '@utils/getEnv';
import { dumpExpressRoutes } from './dumpExpressRoutes';
import { getStatusListStore } from 'statusLists/StatusListStore';
import { getDidSpec } from './endpoints/getDidSpec';
import { createRoutes } from './createRoutes';
import { bearerAdmin } from './bearerAdmin';

const debug = Debug(`eduwallet:server`)

const PORT = Number.parseInt(getEnv('PORT', '5000'));
const LISTEN_ADDRESS = getEnv('LISTEN_ADDRESS', '0.0.0.0');
//const BASEURL = getEnv('BASEURL', 'https://status.dev.eduwallet.nl');

function basicExpressServer() {
    const app = express();
    app.use(morgan("combined"));

    //const store = new expressSession.MemoryStore()
    //app.use(expressSession({ store });

    const corsOptions: CorsOptions = {
        origin: '*',
        credentials: true,
        optionsSuccessStatus: 204,
    }
    app.use(cors(corsOptions));
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))
    app.use(bodyParser.json({ limit: '50mb' }));
    return app;
}

export async function initialiseServer() {
    const app = basicExpressServer();

    // server our basic did:web configuration
    const router = Router();
    getDidSpec(router);
    app.use('/', router);

    const store = getStatusListStore();
    for(const name of Object.keys(store)) {
        const data = store[name];
        bearerAdmin(data);
        createRoutes(data, app);
    }

    debug("starting express server");
    const server = app.listen(PORT, LISTEN_ADDRESS, () => {});
    const terminator = createHttpTerminator({ server, gracefulTerminationTimeout: 10 });

    dumpExpressRoutes(app);
}

