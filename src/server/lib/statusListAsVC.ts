import { StatusListStatus } from "types";
import moment from 'moment';
import { Factory } from '@muisit/cryptokey';
import { getKey } from "@utils/keymanager";
import { JWT } from "jwt/JWT";

// https://github.com/w3c/vc-bitstring-status-list/tree/v0.0.1?tab=readme-ov-file

export async function statusListAsVC(data:StatusListStatus) 
{
    const key = getKey();
    var statusListCredential = {
        "@context": ["https://www.w3.org/ns/credentials/v2", "https://w3id.org/vc-status-list-2021/v1"],
        "id": data.basepath,
        "type": ["VerifiableCredential", data.type.getCredentialType()],
        "issuer": await Factory.toDIDJWK(key!),
        "validFrom": moment().format(moment.defaultFormatUtc),
        "validUntil": moment().add(5,'minutes').format(moment.defaultFormatUtc),
        "issuedAt": moment().format(moment.defaultFormatUtc),
        "credentialSubject": {
            "id": data.basepath + "#list",
            "type": data.type.type,
            "statusPurpose": data.type.purpose,
            "encodedList": data.statusList.revoked
        }
    }

    const jwt = new JWT();
    jwt.payload = statusListCredential;

    // typ and cty are only defined for JSON-LD. The JOSE definition does not mention
    // these headers, but they are not explicitely disallowed either
    jwt.header = {
        alg: key!.algorithms()[0],
        kid: await Factory.toDIDJWK(key!) + '#0',
        typ: 'jwt_vc_json',
    };

    // It is RECOMMENDED to use the IANA JSON Web Token Claims registry and the IANA JSON
    // Web Signature and Encryption Header Parameters registry to identify any claims and
    // header parameters that might be confused with members defined by [VC-DATA-MODEL-2.0].
    // These include but are not limited to: iss, kid, alg, iat, exp, and cnf. 
    jwt.header.iss = await Factory.toDIDJWK(key!);

    // When the iat (Issued At) and/or exp (Expiration Time) JWT claims are present, they 
    // represent the issuance and expiration time of the signature, respectively.
    jwt.payload.iat = moment().unix();
    jwt.payload.exp = moment().add(15, 'minutes').unix();
    jwt.payload.jti = statusListCredential.id;

    await jwt.sign(key!);
    return jwt.token;
}
