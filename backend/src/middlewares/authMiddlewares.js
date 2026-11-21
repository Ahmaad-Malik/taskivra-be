const jwt = require("jsonwebtoken")
const {UnauthorizedError, ForbiddenError, ErrorModel} = require("../errors/appError")
const {redisClient} = require("../config/redisClient")
const { AuthService } = require("../services/authService")
const { SessionService } = require("../services/sessionService")

//Created a factory that returns the actual middleware
//because it needs authService and we are not calling it
//explicitly so we cannot pass service directly to it.
//Instead express calls this middleware implicitly and will
//not pass servcie to it
const authenticate = (authService)=>{
    return async (req, res, next)=>{
        try {
        //validate the user's token
        const token = req.cookies[AuthService.COOKIE_KEY]
        if(!token){
            throw new UnauthorizedError("Authentication required")
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET)

        //checking user activity using session:<jti> stored in redis
        const alive = await redisClient.expire(`session:${payload.jti}`, SessionService.SESSION_IDLE_TIME) //<-- will return 0 if key is not found which means its expired else reset it to 30 min again

        if(!alive){
            res.clearCookie(AuthService.COOKIE_KEY, AuthService.COOKIE_OPTIONS)
            throw new UnauthorizedError("Session expired")
        }

        //check if account is active or not
        const active = await authService.isActiveAccount(payload.accountId)
        if(!active){
            throw new ForbiddenError("Your account is not active")
        }

        req.user = payload // attach payload to the req object to access it later
        next()

        } catch (error) {
            if(error?.name === "TokenExpiredError" || error?. name === "JsonWebTokenError"){
                res.clearCookie(AuthService.COOKIE_KEY, AuthService.COOKIE_OPTIONS)
                error = new UnauthorizedError("Expired or malformed token")
            }
            next(
                new ErrorModel(
                    error,
                    "authenticate",
                    ""
                )
            )
        }
    }

}

const authorize = async(req, res, next)=>{
    //validate if the user is admin or not
    try {
        if(!req.user.isAdmin){
            throw new ForbiddenError("You are not authorized for this action")
        }

        next()
    } catch (error) {
        next(
            new ErrorModel(
                error,
                "authorize",
                ""
            )
        )        
    }
}

const isAccountOwner = async(req, res, next)=>{
    try {
        //check if the user is the owner of the
        //data he is trying to update or delete or fetch
        if (req.user.accountId !== Number(req.params.id)){
            throw new ForbiddenError("You are not authorized for this action")
        }

        next()        
    } catch (error) {
        next(
            new ErrorModel(
                error,
                "isAccountOwner",
                ""
            )
        )
    }
   
} 

module.exports = {authorize, authenticate, isAccountOwner}