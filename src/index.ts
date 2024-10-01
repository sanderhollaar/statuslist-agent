import { initialiseServer } from './server';
import { getDbConnection } from './database';
import { initialiseStatusListStore } from 'statusLists/StatusListStore';

async function main() {
    const dbConnection = await getDbConnection();
    initialiseStatusListStore();
    await initialiseServer();
}

main().catch(console.log)

