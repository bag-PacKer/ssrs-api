const router = require('express-promise-router')();
const passport = require('passport');
const passportConf = require('../passport');
const AccountController = require('../controllers/account');
const { validateBody, schemas } = require('../helpers/routeHelpers');

router.route('/signup')
    .post(
        validateBody(schemas.authSchema),
        AccountController.signUp
    );

router.route('/verify/:daiictId')
    .get(
        AccountController.verifyAccount
    );

router.route('/resendVerificationLink/:daiictId')
    .get(
        AccountController.resendVerificationLink
    );

router.route('/signin')
    .post(
        validateBody(schemas.authSchema),
        passport.authenticate('local', { session: false }),
        AccountController.signIn
    );

router.route('/forgotPassword/:daiictId')
    .get(
        AccountController.forgetPassword
    );

router.route('/resetPassword/:daiictId')
    .get(
        AccountController.verifyResetPasswordLink
    )
    .post(
        AccountController.resetPassword
    );

router.route('/signout')
    .get(
        passport.authenticate('jwt', { session: false }),
        AccountController.signOut
    );
module.exports = router;
