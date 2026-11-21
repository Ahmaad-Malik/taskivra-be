const { ErrorModel } = require("../errors/appError")

const adminAuditLogger = (accountService)=>{
    return async(req, res, next)=>{
        try {
            if(res.locals?.error){
                throw res.locals.error //<-- this is an object of appError coming from controller 
            }
            const id = req.user?.accountId
            const account = await accountService.getAccountById(id)

            const auditLog = {
                timestamp: new Date().toISOString(),
                method: req.method,
                url: req.originalUrl,
                resourceIds: Object.values(req.params),
                adminId: id,
                adminUsername: account.username,
                adminEmail: account.email,
                adminFirstname: account.firstname,
                adminLastname: account.lastname,
                statusCode: res.locals.statusCode,
                success: res.locals.success,
                message: res.locals.message
            }

            console.log("AUDIT LOG : ", auditLog)
            
            res.status(res.locals.statusCode).json({
                success: res.locals.success,
                message: res.locals.message,
                data: res.locals.data
            })

        } catch (error) {
            return next(
                new ErrorModel(
                    error,
                    res.locals?.functionName || "adminAuditLogger",
                    res.locals?.controllerName || ""
                )
            )
        }
    }
}

module.exports = {adminAuditLogger}