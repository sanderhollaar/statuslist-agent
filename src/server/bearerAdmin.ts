import passport from 'passport';
import { Strategy } from 'passport-http-bearer';
import { StatusList } from '../statusLists/StatusList';

export function bearerAdmin(statusList:StatusList) {
    passport.use(statusList.name + '-admin', new Strategy(
        function (token:string, done:Function) {
            if (token == statusList.adminToken) {
                return done(null, statusList);
            }
            return done(null, false);
        }
    ));
}
