import { initialiseServer } from './server';
import { getDbConnection } from './database';
import { initialiseStatusListStore } from 'statusLists/StatusListStore';

async function main() {
    await getDbConnection();
    await initialiseStatusListStore();
    await initialiseServer();
}

main().catch(console.log)

