const express = require("express")
const {AccountService, AdminAccountService} = require("../services/accountService")
const {AccountController, AdminAccountController} = require("../controllers/accountController")
const {authorize, authenticate, isAccountOwner} = require("../middlewares/authMiddlewares")
const {prisma} = require("../../prisma/client")
const {AuthService} = require("../services/authService")
const { SessionService } = require("../services/sessionService")
const {adminAuditLogger} = require("../middlewares/adminAuditLogMiddleware")

//Services and Controllers instances to use them
const sessionService = new SessionService()
const accountService = new AccountService(prisma, sessionService)
const adminAccountService = new AdminAccountService(prisma, sessionService)
const authService = new AuthService(prisma, sessionService)

const accountController = new AccountController(accountService)
const adminAccountController = new AdminAccountController(adminAccountService)

const accountRouter = express.Router()

//Admin specific routes
accountRouter.get(
    "/admin", 
    authenticate(authService), 
    authorize, 
    adminAccountController.getAllAccounts
)

accountRouter.put(
    "/admin/inactivate/:id", 
    authenticate(authService), 
    authorize,
    adminAccountController.updateAccountActivity,
    adminAuditLogger(accountService),
)

//<-- this route is using the same controller as for the
//general user but there is no logging middleware for that.
//That is why a middleware is added here to check whether
//to call logger in the controller or not
accountRouter.delete(
    "/admin/:id",  
    authenticate(authService), 
    authorize,
    (req, res, next)=>{
        res.locals.hasNextMiddleware = true
        next()
    },
    adminAccountController.deleteAccount,
    adminAuditLogger(accountService),
)

//Common Admin and General User Routes
accountRouter.post(
    "/", 
    accountController.signup
)

accountRouter.post(
    "/create", 
    accountController.createAccount
)

accountRouter.put(
    "/changepassword/:id", 
    authenticate(authService), 
    isAccountOwner, 
    accountController.changePassword
)

accountRouter.put(
    "/:id", 
    authenticate(authService), 
    isAccountOwner, 
    accountController.updateAccount
)

accountRouter.get(
    "/:id", 
    authenticate(authService), 
    isAccountOwner, 
    accountController.getProfile
)

accountRouter.delete(
    "/:id", 
    authenticate(authService), 
    isAccountOwner, 
    accountController.deleteAccount
)

module.exports = {accountRouter}