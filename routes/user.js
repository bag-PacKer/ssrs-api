const router = require('express-promise-router')();
const passport = require('passport');
const passportConf = require('../passport');
const userController = require('../controllers/user');
const {validateParam , validateBody, schemas} = require('../helpers/routeHelpers');

router.route('/')
    .post(
        passport.authenticate('jwt',{session: false}),
        validateBody(schemas.addUserByAdminSchema),
        userController.addUser
    );

router.route('/all')
    .get(
        passport.authenticate('jwt',{session: false}),
        userController.getAllUser
    );
    
router.route('/:requestedUserId')
    .get(
        passport.authenticate('jwt',{session: false}),
        userController.getUser
    )
    .put(
        passport.authenticate('jwt',{session: false}),
        userController.replaceUser
    )
    .patch(
        passport.authenticate('jwt',{session: false}),
        userController.updateUser
    )
    .delete(
        passport.authenticate('jwt',{session: false}),
        userController.deleteUser
    );

module.exports = router;