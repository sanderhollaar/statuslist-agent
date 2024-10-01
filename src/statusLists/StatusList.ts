import { base64UrlEncode } from "@utils/base64UrlEncode";
import { getEnv } from "@utils/getEnv";
import pako from 'pako';
import  {Bitstring} from '@digitalcredentials/bitstring';

export interface StatusListOptions {
    name: string;
    token: string;
    size: number;
    purpose:string;
}

export class StatusList {
    public name:string;
    public id:string;
    public adminToken:string;
    public size:number;
    public purpose:string;

    public constructor(opts:StatusListOptions)
    {
        this.name = opts.name;
        this.adminToken = opts.token;
        this.size = opts.size;
        this.purpose = opts.purpose;

        this.id = getEnv('BASEURL', '') + '/' + this.name;
    }

    public async encode()
    {
        var dataList = new Bitstring({length: this.size});
        // TODO: fill dataList with actual database entries
        // bitstring.set(<index>, true);

        return await dataList.encodeBits();
    }
}
