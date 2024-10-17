import { getEnv } from "@utils/getEnv";
import  {Bitstring} from '@digitalcredentials/bitstring';
import { StatusList } from "database/entities/StatusList";
import { getDbConnection } from "database";

export interface StatusListTypeOptions {
    name: string;
    tokens: string[];
    size: number;
    purpose:string;
}

export class StatusListType {
    public name:string;
    public id:string;
    public adminTokens:string[];
    public size:number;
    public purpose:string;
    public lists:StatusList[];

    public constructor(opts:StatusListTypeOptions)
    {
        this.name = opts.name;
        this.adminTokens = opts.tokens;
        this.size = opts.size;
        this.purpose = opts.purpose;

        this.id = getEnv('BASEURL', '') + '/' + this.name;
        this.lists = [];
    }

    public async loadLists()
    {
        const dbConnection = await getDbConnection();
        const repo = dbConnection.getRepository(StatusList);
        this.lists = await repo.find({where:{name: this.name}, order: {index:'ASC'}});
    }

    public async get(index:number)
    {
        await this.loadLists();
        for (const list of this.lists) {
            if (list.index == index) {
                return list;
            }
        }
        throw new Error("No such list");
    }

    public createCredentialUrl(listIndex?:number)
    {
        return getEnv('BASEURL', '') + '/' + this.name + '/' + (listIndex != undefined ? listIndex : '');
    }

    public async newIndex(expirationDate:Date|null|undefined)
    {
        // reload the lists to ensure that we have the latest situation in a multi-user environment
        // TODO: implement a central location or job processor to set the list values
        // to prevent problems. Alternatively, each single-threaded issuer can have its own single-threaded
        // statuslist agent, working around such problems.
        await this.loadLists();
        for (const lst of this.lists) {
            if (lst.used < (0.9 * lst.size)) {
                try {
                    return await this.returnNewIndexFromList(lst, expirationDate);
                }
                catch (e) {
                    // any error caught will cause us to create a new list
                    console.log(e);
                }
            }
        }
        const dbConnection = await getDbConnection();
        const repo = dbConnection.getRepository(StatusList);
        const list = new StatusList();
        list.name = this.name;
        if (this.lists.length > 0) {
            list.index = this.lists[this.lists.length - 1].index + 1;
        }
        else {
            list.index = 1;
        }
        list.size = this.size;
        list.used = 0;
        var dataList = new Bitstring({length: list.size});
        list.content = await dataList.encodeBits();
        list.revoked = list.content; // copy the zero list
        await repo.save(list); // create the list id, but this may be superfluous

        // no try-catch: if we fail here, something else is amiss
        return await this.returnNewIndexFromList(list, expirationDate);
    }

    private async returnNewIndexFromList(list:StatusList, expirationDate:Date|null|undefined)
    {
        var buffer = await Bitstring.decodeBits({encoded:list.content});
        var dataList = new Bitstring({buffer});

        var index = -1;
        var tries = 10000;
        while (index < 0 && tries > 0) {
            tries -= 1;
            index = Math.floor(Math.random() * list.size);
            if (dataList.get(index)) {
                index = -1;
            }
        }
        if (index < 0) {
            throw new Error("List appears full");
        }

        dataList.set(index, true);
        // update the list content
        list.content = await dataList.encodeBits();
        list.used = list.used + 1;
        // update the expiry date of to keep track of when the entire list will expire
        if (expirationDate && (!list.expirationDate || expirationDate > list.expirationDate)) {
            list.expirationDate = expirationDate;
        }

        const dbConnection = await getDbConnection();
        const repo = dbConnection.getRepository(StatusList);
        await repo.save(list);

        return {
            list,
            index
        };
    }

    public async revoke(list:StatusList, index:number, doRevoke:boolean):Promise<string>
    {
        const dataList = new Bitstring({buffer:await Bitstring.decodeBits({encoded:list.content})});
        const revokeList = new Bitstring({buffer: await Bitstring.decodeBits({encoded:list.revoked})});

        var retval:string = 'UNKNOWN';

        if (dataList.get(index)) {
            if (revokeList.get(index)) {
                if (doRevoke) {
                    retval = 'UNCHANGED';
                }
                else {
                    // unrevoke, unsuspend, correct, etc.
                    revokeList.set(index, false);
                    retval = 'UNREVOKED';
                }
            }
            else {
                if (doRevoke) {
                    // revoke, suspend
                    revokeList.set(index, true);
                    retval = 'REVOKED';
                }
                else {
                    retval = 'UNCHANGED';
                }
            }
            if (retval != 'UNCHANGED') {
                list.revoked = await revokeList.encodeBits();
                const dbConnection = await getDbConnection();
                const repo = dbConnection.getRepository(StatusList);
                await repo.save(list);
            }
        }
        else {
            throw new Error("Credential is not enabled");
        }
        return retval;
    }

    public async status(list:StatusList, index:number) {
        var dataList = new Bitstring({length: list.size});
        await dataList.decodeBits(list.content);

        var revokeList = new Bitstring({length: list.size});
        await revokeList.decodeBits(list.revoked);

        if (dataList.get(index)) {
            return revokeList.get(index);
        }
        else {
            throw new Error("Credential is not enabled");
        }
    }    
}
