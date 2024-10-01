import { loadJsonFiles } from "@utils/loadJsonFiles";
import { resolveConfPath } from "@utils/resolveConfPath";
import { StatusList, StatusListOptions } from "./StatusList";

interface StatusListStore {
    [x:string]: StatusList;
}

var _store:StatusListStore = {};

export function getStatusListStore(): StatusListStore {
    return _store;
}

export function initialiseStatusListStore() {
    const options = loadJsonFiles<StatusListOptions>({path: resolveConfPath('lists')});
    for (const opt of options.asArray) {
        const data = new StatusList(opt);
        _store[data.name] = data;
    }    
}