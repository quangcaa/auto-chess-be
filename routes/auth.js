const express = require('express')
const router = express.Router()

const AuthController = require('../controllers/AuthController')
const validateSignup = require('../middlewares/validate')
const isAuth = require('../middlewares/isAuth')

router.post('/signup', validateSignup, AuthController.signup)
router.post('/verify-email', isAuth, AuthController.verifyEmail)
router.post('/login', AuthController.login)
router.post('/refresh', AuthController.refreshToken)
router.post('/logout', AuthController.logout)
router.post('/forgot-password', AuthController.forgotPassword)
router.post('/reset-password/:token', AuthController.resetPassword)

module.exports = router