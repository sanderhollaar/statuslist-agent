import { base64UrlEncode } from "@utils/base64UrlEncode";
import { getEnv } from "@utils/getEnv";
import pako from 'pako';

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

        this.id = getEnv('BASEURL', '') + '/' + this.name
    }

    public async encode()
    {
        var dataList:Uint8Array = new Uint8Array(this.size / 8);
        // TODO: fill dataList with actual database entries

        const deflator = new pako.Deflate();
        deflator.push(dataList, true);
        return base64UrlEncode(deflator.result);
    }
}
