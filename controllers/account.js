const JWT = require(`jsonwebtoken`);
const HttpStatus = require('http-status-codes');
const nodemailer = require("nodemailer");
const randomstring = require("randomstring");

const { user, pass } = require('../configuration/mailAccount');
const User = require('../models/user');
const tempUser = require('../models/tempUser');
const News = require('../models/news');
const Notification = require('../models/notification');
const { httpProtocol,JWT_SECRET, JWT_EXPIRY_TIME, JWT_ISSUER, daiictMailDomainName, userTypes, resources, fieldName, errors, adminTypes, cookiesName } = require('../configuration');
const { accessControl } = require('./access');
const { filterResourceData } = require('../helpers/controllerHelpers')

/*
    Here we are configuring our SMTP Server details.
    STMP is mail server which is responsible for sending and recieving email.
*/
const smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user,
        pass
    },
    tls: { rejectUnauthorized: false } 
});
/*------------------SMTP Over-----------------------------*/

//sign a new token
signToken = user => {
    return JWT.sign({
        iss: JWT_ISSUER,
        sub: user.daiictId,
        iat: new Date().getTime(),
        exp: new Date().setDate(new Date().getDate() + JWT_EXPIRY_TIME),
    }, JWT_SECRET);
};

module.exports = {
    signUp: async (req, res, next) => {

        const { daiictId, password } = req.value.body;
        const primaryEmail = daiictId + '@' + daiictMailDomainName;
        const createdOn = new Date();
        //check if user exist
        const foundUser = await User.findOne({ daiictId });

        //user already exist
        if (foundUser) {
            return res.status(HttpStatus.FORBIDDEN).json({ error: errors.accountAlreadyExists });
        }

        const randomHash = randomstring.generate();
        const host = req.get('host');
        const link = httpProtocol+"://"+host+"/account/verify/"+daiictId+"?id="+randomHash;
        const mailOptions = {
            from: user,
            to: primaryEmail,
            subject: "Please confirm your Email account",
            html: "Hello,<br> Please Click on the link to verify your email.<br><a href=" + link + ">Click here to verify</a>",
            
        }

        
        //create new temp user
        const newUser = new tempUser({
            daiictId,
            primaryEmail,
            password,
            createdOn,
            randomHash
        });
        const savedUser = await newUser.save();
        
        smtpTransport.sendMail(mailOptions, function (error, response) {
            if (error) {
                console.log(error);
                res.end("error");
            } else {
                res.end("<h1>Verification link sent to email " + user.primaryEmail + " please verify your account</h1>");
            }
        });
    },

    signIn: async (req, res, next) => {

        //sign token
        const token = signToken(req.value.body);

        //get User Id
        const { user } = req;
        const permission = accessControl.can(user.userType).readOwn(resources.user);

        var filteredUser = filterResourceData(user, permission.attributes)

        res.cookie(cookiesName.jwt, token, {
            httpOnly: true,
            expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        }).status(HttpStatus.ACCEPTED).json({ user: filteredUser });
    },

    verifyAccount: async (req, res, next) => {
        const {daiictId} = req.params;
        const user = await tempUser.findOne({daiictId})
        
        if (req.query.id == user.randomHash) {
            //create new user
            const newUser = new User({
                daiictId:user.daiictId,
                primaryEmail:user.primaryEmail,
                password:user.password,
                createdOn:user.createdOn
            });
            var savedUser = await newUser.save();
            tempUser.findByIdAndRemove(user._id);
            res.end("<h1>Email " + user.primaryEmail + " is been Successfully verified</h1>");
        }
        else {
            res.end("<h1>Bad Request</h1>");
        }
    },

    signOut: async (req, res, next) => {
        res.clearCookie("jwt");
        res.status(HttpStatus.OK).end();
    },

    updateInformation: async (req, res, next) => {
        //sign token
        const user = req.value.body;

        const userInDB = req.user;

        const permission = accessControl.can(userTypes.student).readOwn(resources.user);
        const editableField = permission.attributes;
        const fieldsToUpdate = Object.keys(user);

        for (let i = 0; i < fieldsToUpdate.length; i++) {
            if (!editableField.includes(fieldsToUpdate[i])) {
                if (userInDB[fieldsToUpdate[i]] != user[fieldsToUpdate[i]]) {
                    permission.granted = false;
                    break;
                }
            }
        }

        if (permission.granted) {
            const savedUser = await User.findByIdAndUpdate(userInDB._id, user);

            var filteredUser = filterResourceData(savedUser, permission.attributes)

            res.status(HttpStatus.ACCEPTED).json({ user: filteredUser });
        } else {
            res.status(HttpStatus.UNAUTHORIZED).json({ error: errors.permissionDenied });
        }
    },

}