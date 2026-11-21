const {redisClient} = require("../config/redisClient.js")
const crypto = require("crypto") 

class SessionService{
    static SESSION_IDLE_TIME = 30 * 60
    static SESSION_MAX_TIME = 3 * 60 * 60

    createSession = async(accountId)=>{
        const jti = crypto.randomBytes(32).toString("hex")
        const sessionKey = SessionService.sessionKey(jti)
        const userSessionsKey = SessionService.userSessionsKey(accountId)

        await redisClient.multi()
        .set(sessionKey, String(accountId), {EX: SessionService.SESSION_IDLE_TIME})
        .sAdd(userSessionsKey, jti)
        .expire(userSessionsKey, SessionService.SESSION_MAX_TIME) //expiring all after 3h
        .exec()
        return jti
    }

    revokeSessions = async(accountId, exceptJti=null)=>{
        const userSessionsKey = SessionService.userSessionsKey(accountId)
        const jtis = await redisClient.sMembers(userSessionsKey)
        const toRevoke = jtis.filter((j)=> j !== exceptJti)
        if(toRevoke.length === 0){
            return 0
        }
        const tx = redisClient.multi()
        for(const j of toRevoke){
            tx.del(SessionService.sessionKey(j))
        }
        tx.sRem(userSessionsKey, toRevoke)
        await tx.exec()
        return toRevoke.length
    }

    revokeSingleSession = async(accountId, jti)=>{
        const sessionKey = SessionService.sessionKey(jti)
        const userSessionsKey = SessionService.userSessionsKey(accountId)

        await redisClient.multi()
        .del(sessionKey)
        .sRem(userSessionsKey, jti)
        .exec()
    }

    static sessionKey = (jti)=>{
        return `session:${jti}`
    }

    static userSessionsKey = (accountId)=>{
        return `user_sessions:${accountId}`
    }
}

module.exports = {SessionService}