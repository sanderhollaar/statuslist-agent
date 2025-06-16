import { getKey } from 'utils/keymanager';
import { JWT } from 'jwt/JWT';
import moment from 'moment'
import { StatusListStatus } from 'types';

// https://datatracker.ietf.org/doc/draft-ietf-oauth-status-list/11/
export async function statusListAsJWT(data:StatusListStatus)
{
    const key = getKey();

    const jwt = new JWT();
    jwt.payload = Object.assign({}, data);

    jwt.header = {
        alg: key.algorithms()[0],
        kid: key.exportPublicKey(),
        typ: 'statuslist+jwt',
    };

    jwt.payload = {
        exp: moment().add(15, 'minutes').unix(), // considered expired
        iat: moment().unix(),
        sub: data.basepath,
        ttl: 5 * 60, // maximum time to cache
        status_list: {
            bits: data.type.bitSize,
            lst: data.statusList.revoked
        }
    }

    await jwt.sign(key);
    return jwt.token;
}