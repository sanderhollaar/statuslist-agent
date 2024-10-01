import Debug from 'debug'
import express, {Express} from 'express'
import { StatusList } from "statusLists/StatusList";
import { getCredential } from './endpoints/getCredential';

const debug = Debug(`statuslists:server`)


export function createRoutes(statusList:StatusList, app:Express) {
    debug('creating routes for ', statusList.name);

    const router = express.Router();
    app.use('/' + statusList.name, router);
    getCredential(statusList, router);
}

