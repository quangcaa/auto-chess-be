const bcryptjs = require('bcryptjs')
const dotenv = require('dotenv')
const crypto = require('crypto')

dotenv.config()

const { sequelize, User, Passwordreset, Profile } = require('../db/models')
const { Op } = require('sequelize')

const generateVerificationCode = require('../utils/generateVerificationCode')
const { generateToken, decodeToken } = require('../utils/authen')
const { sendVerificationEmail, sendPasswordResetEmail } = require('../mailtrap/email')

class AuthController {
    // @route [POST] /auth/signup
    // @desc Sign up an account
    // @access Public
    async signup(req, res) {
        const { username, email, password } = req.body

        try {
            if (!username || !email || !password) {
                throw new Error('Some fields are missing')
            }

            // check if username for email exists
            const userAlreadyExists = await User.findOne({
                where: {
                    [Op.or]: [
                        { username },
                        { email }
                    ]
                }
            })
            if (userAlreadyExists) {
                return res.status(400).json({ success: false, message: 'User already exists' })
            }

            // create new account 
            const hashedPassword = await bcryptjs.hash(password, 12)
            const verificationCode = generateVerificationCode()

            const user = await User.create({
                username,
                email,
                password: hashedPassword,
                verification_code: verificationCode,
                verification_code_expires_at: Date.now() + 15 * 60 * 1000 // 15 minutes
            })

            // create user profile
            const profile = await Profile.create({
                user_id: user.toJSON().user_id
            })

            // generate access token
            const accessTokenLife = process.env.ACCESS_TOKEN_LIFE
            const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET
            const dataForAccessToken = {
                user_id: user.toJSON().user_id,
            }
            const accessToken = await generateToken(
                dataForAccessToken,
                accessTokenSecret,
                accessTokenLife
            )

            // generate refresh token
            const refreshTokenLife = process.env.REFRESH_TOKEN_LIFE
            const refreshTokenSecret = process.env.REFRESH_TOKEN_LIFE
            const dataForRefreshToken = {
                user_id: user.toJSON().user_id,
            }
            let refreshToken = await generateToken(
                dataForRefreshToken,
                refreshTokenSecret,
                refreshTokenLife
            )
            await User.update(
                { refresh_token: refreshToken },
                { where: { user_id: user.toJSON().user_id } }
            )

            // verify email
            // await sendVerificationEmail(user.email, user.username, verificationCode)

            const userObj = user.toJSON()
            delete userObj.password

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                user: userObj,
                accessToken,
            })

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: `Error in signup: ${error.message}`
            })
        }
    }

    // @route POST /auth/verify-email
    // @desc Verify email to create account
    // @access Private
    async verifyEmail(req, res) {
        const { code } = req.body

        try {
            const user = await User.findOne({
                where: {
                    user_id: req.user_id,
                    verification_code: code,
                    verification_code_expires_at: {
                        [Op.gt]: Date.now()
                    }
                }
            })

            if (!user) {
                return res.status(400).json({ success: false, message: 'Invalid or expired code' })
            }

            // update db
            await User.update(
                {
                    is_verified: true,
                    verification_code: null,
                    verification_code_expires_at: null
                },
                {
                    where: { user_id: user.user_id }
                }
            )

            res.status(200).json({ success: true, message: 'Email verified successfully' })
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: `Error in verifyEmail: ${error.message}`
            })
        }
    }

    // @route POST /auth/login
    // @desc Log in to play chess
    // @access Public
    async login(req, res) {
        const { username, password } = req.body

        try {
            if (!username || !password) {
                throw new Error('Some fields are missing')
            }

            // check username 
            const user = await User.findOne({
                where: {
                    username
                }
            })
            if (!user) {
                return res.status(400).json({ success: false, message: 'Invalid username or password' })
            }

            // check password
            const isPasswordValid = bcryptjs.compareSync(password, user.password) // dong bo
            if (!isPasswordValid) {
                return res.status(400).json({ success: false, message: 'Invalid username or password' })
            }

            // generate access token
            const accessTokenLife = process.env.ACCESS_TOKEN_LIFE
            const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET
            const dataForAccessToken = {
                user_id: user.user_id,
            }
            const accessToken = await generateToken(
                dataForAccessToken,
                accessTokenSecret,
                accessTokenLife
            )

            // generate refresh token
            const refreshTokenLife = process.env.REFRESH_TOKEN_LIFE
            const refreshTokenSecret = process.env.REFRESH_TOKEN_LIFE
            const dataForRefreshToken = {
                user_id: user.user_id,
            }
            let refreshToken = await generateToken(
                dataForRefreshToken,
                refreshTokenSecret,
                refreshTokenLife
            )
            if (!user.refresh_token) {
                await User.update(
                    {
                        refresh_token: refreshToken,
                    },
                    {
                        where: { user_id: user.user_id }
                    }

                )
            } else {
                refreshToken = user.refresh_token
            }

            return res.status(200).json({
                success: true,
                message: 'Logged in successfully',
                accessToken,
                user_id: user.user_id,
                username: user.username
            })
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: `Error in login: ${error.message}`
            })
        }
    }

    // @route POST /auth/refresh
    // @desc generate new access-token when expired
    // @access Private
    async refreshToken(req, res) {
        try {
            // get access-token from header
            const accessTokenFromHeader = req.headers.x_authorization
            if (!accessTokenFromHeader) {
                return res.status(400).json({ success: false, message: 'Access token is missing' })
            }

            // get refresh-token from body
            const refreshTokenFromBody = req.body.refreshToken
            if (!refreshTokenFromBody) {
                return res.status(400).json({ success: false, message: 'Refresh token is missing' })
            }

            const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET
            const accessTokenLife = process.env.ACCESS_TOKEN_LIFE

            // decode access-token
            const decoded = await decodeToken(accessTokenFromHeader, accessTokenSecret)
            if (!decoded) {
                return res.status(400).json({ success: false, message: 'Invalid access token' })
            }

            // if access-token valid
            const user_id = decoded.payload.user_id

            const user = await User.findByPk(user_id)
            if (!user) {
                return res.status(400).json({ success: false, message: 'User does not exist' })
            }

            // refresh-token req vs database
            if (refreshTokenFromBody !== user.refresh_token) {
                return res.status(400).json({ success: false, message: 'Invalid refresh token' })
            }

            // create new access-token (if refresh-token valid)
            const dataForAccessToken = { user_id }
            const accessToken = await generateToken(
                dataForAccessToken,
                accessTokenSecret,
                accessTokenLife,
            )
            if (!accessToken) {
                return res.status(400).json({ success: false, message: 'Failed to create access token, please try again' })
            }

            return res.status(200).json({ accessToken })
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: `Error in refreshToken: ${error.message}`
            })
        }
    }

    // @route POST /auth/logout
    // @desc Log out account
    // @access Private
    async logout(req, res) {
        try {
            // get access-token from header
            const accessTokenFromHeader = req.headers.x_authorization
            if (!accessTokenFromHeader) {
                return res.status(400).json({ success: false, message: 'Access token is missing' })
            }

            // decode access-token
            const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET
            const decoded = await decodeToken(accessTokenFromHeader, accessTokenSecret)
            if (!decoded) {
                return res.status(400).json({ success: false, message: 'Invalid access token' })
            }

            // find user by user_id from decoded token
            const user_id = decoded.payload.user_id
            const user = await User.findByPk(user_id)
            if (!user) {
                return res.status(400).json({ success: false, message: 'User does not exist' })
            }

            // set refresh_token to null
            await User.update(
                { refresh_token: null },
                { where: { user_id } }
            )

            return res.status(200).json({ success: true, message: 'Logged out successfully' })
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: `Error in logout: ${error.message}`
            })
        }
    }

    // @route POST /auth/forgot-password
    // @desc Send reset password link to email
    // @access Public
    async forgotPassword(req, res) {
        const { email } = req.body

        try {
            const user = await User.findOne({ where: { email } })
            if (!user) {
                return res.status(400).json({ success: false, message: 'User not found' })
            }

            // generate reset token
            const resetToken = crypto.randomBytes(20).toString('hex')
            const resetTokenExpiresAt = Date.now() + 15 * 60 * 1000 // 15 minutes

            // create record 
            await Passwordreset.create({
                user_id: user.user_id,
                reset_password_token: resetToken,
                reset_password_expires_at: resetTokenExpiresAt,
            })

            // send email
            await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}:${process.env.PORT}/reset-password/${resetToken}`)

            return res.status(200).json({ success: true, message: 'Password reset link sent to your email' })
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: `Error in forgotPassword: ${error.message}`
            })
        }
    }

    // @route POST /auth/reset-password/:token
    // @desc reset old password, create new one 
    // @access Public
    async resetPassword(req, res) {
        const { token } = req.params
        const { password } = req.body

        try {
            // check token
            const resetRequest = await Passwordreset.findOne({
                where: {
                    reset_password_token: token,
                    reset_password_expires_at: {
                        [Op.gt]: Date.now()
                    }
                }
            })
            if (!resetRequest) {
                return res.status(400).json({ success: false, message: 'Invalid or expired token' })
            }

            // hash new password
            const hashedPassword = await bcryptjs.hash(password, 12)

            // udpate new password
            await User.update(
                { password: hashedPassword },
                { where: { user_id: resetRequest.user_id } }
            )

            resetRequest.reset_password_token = null
            resetRequest.reset_password_expires_at = null
            await resetRequest.save()

            return res.status(200).json({ success: true, message: 'Password reset successfully' })
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: `Error in resetPassword: ${error.message}`
            })
        }
    }
}

module.exports = new AuthController()