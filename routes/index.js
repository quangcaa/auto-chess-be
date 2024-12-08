const authRouter = require('./auth')
const accountRouter = require('./account')
const inboxRouter = require('./inbox')
const puzzleRouter = require('./puzzle')
const forumRouter = require('./forum')
const profileRouter = require('./profile')
const relationRouter = require('./relation')
const searchRouter = require('./search')
const notificationRouter = require('./notification')
const challengeRouter = require('./challenge')
const gameRouter = require('./game')
const reportRouter = require('./report')

const route = (app) => {
    app.use('/auth', authRouter)
    app.use('/account', accountRouter)
    app.use('/@', profileRouter)
    app.use('/rel', relationRouter)
    app.use('/inbox', inboxRouter)
    app.use('/puzzle', puzzleRouter)
    app.use('/forum', forumRouter)
    app.use('/search', searchRouter)
    app.use('/notification', notificationRouter)
    app.use('/challenge', challengeRouter)
    app.use('/game', gameRouter)
    app.use('/report', reportRouter)
}

module.exports = route