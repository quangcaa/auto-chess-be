const express = require('express')
const router = express.Router()

const ProfileController = require('../controllers/ProfileController')
const isAuth = require('../middlewares/isAuth')

router.get('/:username', isAuth, ProfileController.getUserProfile)
router.get('/:username/following', isAuth, ProfileController.getAllFollowing)

module.exports = router