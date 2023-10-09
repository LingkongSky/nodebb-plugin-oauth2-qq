'use strict';
(function (module) {
    /*
            Welcome to the SSO OAuth plugin! If you're inspecting this code, you're probably looking to
            hook up NodeBB with your existing OAuth endpoint.
    
            Step 1: Fill in the "constants" section below with the requisite informaton. Either the "oauth"
                    or "oauth2" section needs to be filled, depending on what you set "type" to.
    
            Step 2: Give it a whirl. If you see the congrats message, you're doing well so far!
    
            Step 3: Customise the `parseUserReturn` method to normalise your user route's data return into
                    a format accepted by NodeBB. Instructions are provided there. (Line 146)
    
            Step 4: If all goes well, you'll be able to login/register via your OAuth endpoint credentials.
        */

    const User = require.main.require('./src/user');
    const Groups = require.main.require('./src/groups');
    const db = require.main.require('./src/database');
    const authenticationController = require.main.require('./src/controllers/authentication');
    const meta = require.main.require('./src/meta');

    const async = require('async');

    const passport = require.main.require('passport');
    const nconf = require.main.require('nconf');
    const winston = require.main.require('winston');

    /**
         * REMEMBER
         *   Never save your OAuth Key/Secret or OAuth2 ID/Secret pair in code! It could be published and leaked accidentally.
         *   Save it into your config.json file instead:
         *
         *   {
         *     ...
         *     "oauth": {
         *       "id": "someoauthid",
         *       "secret": "youroauthsecret"
         *     }
         *     ...
         *   }
         *
         *   ... or use environment variables instead:
         *
         *   `OAUTH__ID=someoauthid OAUTH__SECRET=youroauthsecret node app.js`
         */

    const OAuth = {};
    let configOk = false;
    let passportOAuth;
    let opts;


    const constants = Object.freeze({
        type: 'oauth2', // Either 'oauth' or 'oauth2'
        name: 'qq', // Something unique to your OAuth provider in lowercase, like "github", or "nodebb"
        userRoute: '/plugins/oauth2-qq/', // This is the address to your app's "user profile" API endpoint (expects JSON)
    });



    if (!constants.name) {
        winston.error('[sso-oauth] Please specify a name for your OAuth provider (library.js:32)');
    } else if (!constants.type || (constants.type !== 'oauth' && constants.type !== 'oauth2')) {
        winston.error('[sso-oauth] Please specify an OAuth strategy to utilise (library.js:31)');
    } else if (!constants.userRoute) {
        winston.error('[sso-oauth] User Route required (library.js:31)');
    } else {
        configOk = true;
    }


    OAuth.init = function (data, callback) {

        const hostHelpers = require.main.require('./src/routes/helpers');

        hostHelpers.setupAdminPageRoute(data.router, '/admin/plugins/oauth2-qq', (req, res) => {
            res.render('admin/plugins/oauth2-qq', {
                title: "QQ",
                baseUrl: nconf.get('url'),
            });
        });

        hostHelpers.setupPageRoute(data.router, '/deauth/qq', [data.middleware.requireUser], (req, res) => {
            res.render('plugins/oauth2-qq/deauth', {
                service: 'qq',
            });
        });
        data.router.post('/deauth/qq', [data.middleware.requireUser, data.middleware.applyCSRF], (req, res, next) => {

            OAuth.deleteUserData({
                uid: req.user.uid,
            }, (err) => {
                if (err) {
                    return next(err);
                }

                res.redirect(`${nconf.get('relative_path')}/me/edit`);
            });

        });


        meta.settings.get('oauth2-qq', (_, loadedSettings) => {

            callback();
        });



    };

    OAuth.addMenuItem = function (custom_header, callback) {
        custom_header.authentication.push({
            route: "/plugins/oauth2-qq",
            icon: 'fa-tint',
            name: 'OAuth2 QQ',
        });

        callback(null, custom_header);
    };








    OAuth.getStrategy = function (strategies, callback) {
        if (configOk) {

            passportOAuth = require('passport-oauth')['OAuth2Strategy'];
        meta.settings.get('oauth2-qq', function (err, settings){
  
            // OAuth 2 options
            opts = {
                authorizationURL: 'https://graph.qq.com/oauth2.0/authorize',
                tokenURL: 'https://graph.qq.com/oauth2.0/token',
                clientID: settings.id, //读取管理面板设置
                clientSecret: settings.key, // don't change this line
            };
            opts.callbackURL = nconf.get('url') + "/auth/" + constants.name + "/callback";

            passportOAuth.Strategy.prototype.userProfile = function (accessToken, done) {

                this._oauth2._useAuthorizationHeaderForGET = true;

                this._oauth2.get(constants.userRoute, accessToken, (err, body/* , res */) => {
                    
                    if (err) {
                        return done(err);
                    }

                    try {
                        const json = JSON.parse(body);

                        
                        OAuth.parseUserReturn(json, (err, profile) => {
                            if (err) return done(err);
                            profile.provider = constants.name;

                            done(null, profile);
                        });


                    } catch (e) {
                        done(e);
                    }
                });
            };


            opts.passReqToCallback = true;

            passport.use(constants.name, new passportOAuth(opts, async (req, token, secret, profile, done) => {
                const user = await OAuth.login({
                    oAuthid: profile.id,
                    handle: profile.displayName,
                    email: profile.emails[0].value,
                    isAdmin: profile.isAdmin,
                });

                authenticationController.onSuccessfulLogin(req, user.uid, (err) => {
                    done(err, !err ? user : null);
                });



            }));

            strategies.push({
                name: constants.name,
                url: `/auth/${constants.name}`,
                callbackURL: `/auth/${constants.name}/callback`,
                icon: 'fa-check-square',
                labels: {
                    login: '[[oauth2-qq:login]]',
                    register: '[[oauth2-qq:login]]',
                },
                color: '#1DA1F2',
                scope: (constants.scope || '').split(','),
            });
                callback(null, strategies);
        });

        } else {
            callback(new Error('OAuth Configuration is invalid'));
        }
    };

    OAuth.parseUserReturn = function (data, callback) {
        // Alter this section to include whatever data is necessary
        // NodeBB *requires* the following: id, displayName, emails.
        // Everything else is optional.

        // Find out what is available by uncommenting this line:
        // console.log(data);

        const profile = {};
        profile.id = data.id;
        profile.displayName = data.name;
        profile.emails = [{ value: data.email }];

        // Do you want to automatically make somebody an admin? This line might help you do that...
        // profile.isAdmin = data.isAdmin ? true : false;

        // Delete or comment out the next TWO (2) lines when you are ready to proceed
        process.stdout.write('===\nAt this point, you\'ll need to customise the above section to id, displayName, and emails into the "profile" object.\n===');
        return callback(new Error('Congrats! So far so good -- please see server log for details'));

        // eslint-disable-next-line
        callback(null, profile);
    };

    OAuth.login = async (payload) => {
        let uid = await OAuth.getUidByOAuthid(payload.oAuthid);
        if (uid !== null) {
            // Existing User
            return ({
                uid: uid,
            });
        }

        // Check for user via email fallback
        uid = await User.getUidByEmail(payload.email);
        if (!uid) {
            /**
                 * The email retrieved from the user profile might not be trusted.
                 * Only you would know — it's up to you to decide whether or not to:
                 *   - Send the welcome email which prompts for verification (default)
                 *   - Bypass the welcome email and automatically verify the email (commented out, below)
                 */
            const { email } = payload;

            // New user
            uid = await User.create({
                username: payload.handle,
                email, // if you uncomment the block below, comment this line out
            });

            // Automatically confirm user email
            // await User.setUserField(uid, 'email', email);
            // await UserEmail.confirmByUid(uid);
        }

        // Save provider-specific information to the user
        await User.setUserField(uid, `${constants.name}Id`, payload.oAuthid);
        await db.setObjectField(`${constants.name}Id:uid`, payload.oAuthid, uid);

        if (payload.isAdmin) {
            await Groups.join('administrators', uid);
        }

        return {
            uid: uid,
        };
    };

    OAuth.getUidByOAuthid = async oAuthid => db.getObjectField(`${constants.name}Id:uid`, oAuthid);

    OAuth.deleteUserData = function (data, callback) {
        async.waterfall([
            async.apply(User.getUserField, data.uid, `${constants.name}Id`),
            function (oAuthIdToDelete, next) {
                db.deleteObjectField(`${constants.name}Id:uid`, oAuthIdToDelete, next);
            },
        ], (err) => {
            if (err) {
                winston.error(`[sso-oauth] Could not remove OAuthId data for uid ${data.uid}. Error: ${err}`);
                return callback(err);
            }

            callback(null, data);
        });
    };

    // If this filter is not there, the deleteUserData function will fail when getting the oauthId for deletion.
    OAuth.whitelistFields = function (params, callback) {
        params.whitelist.push(`${constants.name}Id`);
        callback(null, params);
    };

    OAuth.load = async function (params) {
/*
        const settings = await meta.settings.get('oauth2-qq');
        if (!settings) {
            winston.warn(`[plugins/${pluginData.nbbId}] Settings not set or could not be retrieved!`);
            return;
        }


        pluginSettings = settings;
        
            const routeHelpers = require.main.require('./src/routes/helpers');
            routeHelpers.setupAdminPageRoute(params.router, `/admin/plugins/${pluginData.nbbId}`, renderAdmin);
        
            */
    };

    module.exports = OAuth;

}(module));