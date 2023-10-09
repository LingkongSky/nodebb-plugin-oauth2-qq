'use strict';
(function (module) {

    const User = require.main.require('./src/user');
   // const Groups = require.main.require('./src/groups');
    const db = require.main.require('./src/database');
    const authenticationController = require.main.require('./src/controllers/authentication');
    const meta = require.main.require('./src/meta');
    const QQStrategy = require('passport-qq2015-fix').Strategy

    const async = require('async');

    const passport = require.main.require('passport');
    const nconf = require.main.require('nconf');
    const winston = require.main.require('winston');

    

    const OAuth = {};
    let configOk = false;
  


    const constants = Object.freeze({
        type: 'oauth2', // Either 'oauth' or 'oauth2'
        name: 'qq', // Something unique to your OAuth provider in lowercase, like "github", or "nodebb"
        userRoute: '/plugins/oauth2-qq/', // This is the address to your app's "user profile" API endpoint (expects JSON)
    });


    meta.settings.get('oauth2-qq', function (err, settings) {

    if (!constants.name) {
        winston.error('[sso-oauth] Please specify a name for your OAuth provider (library.js:32)');
    } else if (!constants.type || (constants.type !== 'oauth' && constants.type !== 'oauth2')) {
        winston.error('[sso-oauth] Please specify an OAuth strategy to utilise (library.js:31)');
    } else if (!constants.userRoute) {
        winston.error('[sso-oauth] User Route required (library.js:31)');
    } else if (settings.login === 'on') {
        configOk = true;
    }
    });

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

        function renderAdmin(req, res) {
            res.render('admin/plugins/oauth2-qq', {
                callbackURL: nconf.get('url') + '/auth/qq/callback'
            })
        }


        data.router.get('/admin/plugins/oauth2-qq', data.middleware.admin.buildHeader, renderAdmin)
        data.router.get('/api/admin/plugins/oauth2-qq', renderAdmin)

        data.router.get('/auth/qq/callback', function (req, res, next) {
            req.query.state = req.session.ssoState
            next()
        })



        data.router.post('/deauth/qq', [data.middleware.requireUser, data.middleware.applyCSRF], function (req, res, next) {
            OAuth.deleteUserData({
                uid: req.user.uid
            }, function (err, uid) {
                if (err) {
                    return next(err)
                }
                User.getUserField(uid, 'userslug', function (err, userslug) {
                    if (err) {
                        return next(err)
                    }
                    res.redirect(nconf.get('relative_path') + '/user/' + userslug + '/edit')
                })
            })
        })
            callback();
    };

    OAuth.addMenuItem = function (custom_header, callback) {
        custom_header.authentication.push({
            route: "/plugins/oauth2-qq",
            icon: 'fa-qq',
            name: 'OAuth2 QQ',
        });

        callback(null, custom_header);
    };




    OAuth.getStrategy = function (strategies, callback) {
        if (configOk) {

          //  passportOAuth = require('passport-oauth')['OAuth2Strategy'];
        meta.settings.get('oauth2-qq', function (err, settings){
  
            passport.use(constants.name, new QQStrategy({
                clientID: settings.id, //读取管理面板设置
                clientSecret: settings.key, // don't change this line
                callbackURL: nconf.get('url') + "/auth/" + constants.name +"/callback",
                passReqToCallback: true
                    }, function (req, accessToken, refreshToken, profile, done) {
                try {
                    profile = JSON.parse(profile)
                } catch (e) {
                    done(e)
                }
                if (profile.ret === -1) { // Try Catch Error
                    winston.error('[OAuth2-qq]The Profile return -1,skipped.')
                    return done(new Error("There's something wrong with your request or QQ Connect API.Please try again."))
                }

                // 存储头像信息
                let avatar = (profile.figureurl_qq_2 == null) ? profile.figureurl_qq_1 : profile.figureurl_qq_2 // Set avatar image
                avatar = avatar.replace('http://', 'https://');
                // 如果用户已经登录，那么我们就绑定他
                if (req.hasOwnProperty('user') && req.user.hasOwnProperty('uid') && req.user.uid > 0) {
                    // 如果用户想重复绑定的话，我们就拒绝他。
                    OAuth.hasQQID(profile.id, function (err, res) {
                        if (err) {
                            winston.error(err)
                            return done(err)
                        } else {
                            if (res) {
                                winston.error('[OAuth2-qq] qqid:' + profile.id + 'is binded.')
                                // qqid is exist
                                return done(new Error('[[error:sso-multiple-association]]'))
                            } else {
                                User.setUserField(req.user.uid, 'qqid', profile.id)
                                db.setObjectField('qqid:uid', profile.id, req.user.uid)
                                User.setUserField(req.user.uid, 'qqpic', avatar)
                                winston.info('[OAuth2-qq]user:' + req.user.uid + 'is binded.(openid is ' + profile.id + ' and nickname is ' + profile.nickname + ')')
                                return done(null, req.user)
                            }
                        }

                    })
                } else {
                    // 登录方法
                    var email = profile.id + '@noreply.qq.com'
                    OAuth.login(profile.id, profile.nickname, avatar, email, function (err, user) { // 3.29 add avatar
                        if (err) {
                            return done(err)
                        } else {

                            // Require collection of email
                            if (email.endsWith('@norelpy.qq.com') || email.endsWith('@noreply.qq.com')) {
                                req.session.registration = req.session.registration || {}
                                req.session.registration.uid = user.uid
                                req.session.registration.qqid = profile.id
                            }
                            authenticationController.onSuccessfulLogin(req, user.uid, function (err) {
                                if (err) {
                                    return done(err)
                                } else {
                                    return done(null, user)
                                }
                            })



                        }
                    })
                }
            }))

            // 定义本插件的一些信息
            strategies.push({
                name: constants.name,
                url: `/auth/${constants.name}`,
                callbackURL: `/auth/${constants.name}/callback`,
                icon: 'fa-qq',
                labels: {
                    login: '[[oauth2-qq:login]]',
                    register: '[[oauth2-qq:login]]',
                },
                color: '#1DA1F2',
                scope: 'get_user_info'
            })

                callback(null, strategies);
        });

        } else {
            callback(new Error('OAuth Configuration is invalid'));
        }
    };


    OAuth.hasQQID = function (qqid, callback) {
        db.isObjectField(`${constants.name}id:uid`, qqid, function (err, res) {
            if (err) {
                callback(err)
            } else {
                callback(null, res)
            }
        })
    }


    OAuth.getAssociation = function (data, callback) {
        User.getUserField(data.uid, `${constants.name}id`, function (err, qqid) {
            if (err) {
                return callback(err, data)
            }

            if (qqid) {
                data.associations.push({
                    associated: true,
                    deauthUrl: nconf.get('url') + '/deauth/' + constants.name,
                    name: constants.name,
                    icon: 'fa-qq'
                })
            } else {
                data.associations.push({
                    associated: false,
                    url: nconf.get('url') + '/auth/' + constants.name,
                    name: constants.name,
                    icon: 'fa-qq'
                })
            }

            callback(null, data)
        })
    };


    OAuth.getUidByQQid = function (oAuthid, callback) {
        db.getObjectField('qqid:uid', oAuthid, function (err, uid) {
            if (err) {
                callback(err);
            } else {
                callback(null, uid);
            }
        });
    };
    

    OAuth.login = function (qqID, username, avatar, email, callback) {

        OAuth.getUidByQQid(qqID, function (err, uid) {
            if (err) {
                return callback(err)
            }
            // winston.verbose("[OAuth2-qq]uid:" + uid);
            if (uid !== null) {
                // Existing User
                winston.info('[OAuth2-qq]User:' + uid + ' is logged via OAuth2-qq')
                User.setUserField(uid, 'qqpic', avatar) // 更新头像
                callback(null, {
                    uid: uid
                })
            } else {
                //New User
                // 为了放置可能导致的修改用户数据，结果重新建立了一个账户的问题，所以我们给他一个默认邮箱
                winston.info("[OAuth2-qq]User isn't Exist.Try to Creat a new account.")
                winston.info("[OAuth2-qq]New Account's Username：" + username + ' and openid:' + qqID)
                // New User
                // From SSO-Twitter
                User.create({
                    username: username,
               //     email: email
                }, function (err, uid) {
                    if (err) {
                        User.create({
                            username: 'qq-' + qqID,
                      //      email: email
                        }, function (err, uid) {
                            if (err) {
                                return callback(err)
                            } else {
                                // Save qq-specific information to the user
                                User.setUserField(uid, 'qqid', qqID);
                                db.setObjectField('qqid:uid', qqID, uid);
                                // Save their photo, if present
                            //    User.setUserField(uid, 'picture', avatar);
                             //   User.setUserField(uid, 'qqpic', avatar);
                                callback(null, {
                                    uid: uid
                                })
                            }
                        })
                    } else {
                        // Save qq-specific information to the user
                        User.setUserField(uid, 'qqid', qqID);
                        db.setObjectField('qqid:uid', qqID, uid);
                        // Save their photo, if present
                      //  User.setUserField(uid, 'picture', avatar);
                      //  User.setUserField(uid, 'qqpic', avatar);
                        callback(null, {
                            uid: uid
                        })
                    }
                })
            }
        })
    }

    OAuth.deleteUserData = function (data, callback) {
        async.waterfall([
            async.apply(User.getUserField, data.uid, `${constants.name}id`),
            function (oAuthIdToDelete, next) {
                db.deleteObjectField(`${constants.name}id:uid`, oAuthIdToDelete, next);
            },
        ], (err) => {
            if (err) {
                winston.error(`[sso-oauth] Could not remove OAuthId data for uid ${data.uid}. Error: ${err}`);
                return callback(err);
            }

            callback(null, data);
        });
    };


    OAuth.prepareInterstitial = (data, callback) => {
        // Only execute if:
        //   - uid and qqid are set in session
        //   - email ends with "@noreply.qq.com"
        if (data.userData.hasOwnProperty('uid') && data.userData.hasOwnProperty('qqid')) {


            User.getUserField(data.userData.uid, 'email', function (err, email) {
                if (err) {
                    return callback(err)
                }

               /* if (email && (email.endsWith('@noreply.qq.com') || email.endsWith('@norelpy.qq.com'))) {
                    data.interstitials.push({
                        template: 'partials/oauth2-qq/email.tpl',
                        data: {},
                        callback: OAuth.storeAdditionalData
                    })
                }*/

                callback(null, data)
            })
        } else {
            callback(null, data)
        }
    }

    /*
    OAuth.get = (data, callback) => {
        if (data.type === 'qq') {
            OAuth.getQQPicture(data.uid, function (err, QQPicture) {
                if (err) {
                    winston.error(err)
                    return callback(null, data)
                }
                if (QQPicture == null) {
                    winston.error('[OAuth2-qq]uid:' + data.uid + 'is invalid,skipping...')
                    return callback(null, data)
                }
                data.picture = QQPicture
                callback(null, data)
            })
        } else {
            callback(null, data)
        }
    }



    OAuth.list = (data, callback) => {
        OAuth.getQQPicture(data.uid, function (err, QQPicture) {
            if (err) {
                winston.error(err)
                return callback(null, data)
            }
            if (QQPicture == null) {
                winston.error('[OAuth2-qq]uid:' + data.uid + 'is invalid,skipping...')
                return callback(null, data)
            }
            data.pictures.push({
                type: 'qq',
                url: QQPicture,
                text: 'QQ头像'
            })
            callback(null, data)
        })
    }

    OAuth.getQQPicture = function (uid, callback) {
        User.getUserField(uid, 'qqpic', function (err, pic) {
            if (err) {
                return callback(err)
            }
            callback(null, pic)
        })
    }
*/



    OAuth.storeAdditionalData = function (userData, data, callback) {
        async.waterfall([
            // Reset email confirm throttle
            async.apply(db.delete, 'uid:' + userData.uid + ':confirm:email:sent'),
            async.apply(User.getUserField, userData.uid, 'email'),
            function (email, next) {
                // Remove the old email from sorted set reference
                email = email.toLowerCase()
                db.sortedSetRemove('email:uid', email, next)
            },
            async.apply(User.setUserField, userData.uid, 'email', data.email),
            async.apply(User.email.sendValidationEmail, userData.uid, data.email)
        ], callback)
    }

    module.exports = OAuth;

}(module));