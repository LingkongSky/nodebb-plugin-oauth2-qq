'use strict';
(function (module) {

    const User = require.main.require('./src/user');
    const db = require.main.require('./src/database');
    const authenticationController = require.main.require('./src/controllers/authentication');
    const meta = require.main.require('./src/meta');
    const QQStrategy = require('passport-qq2015-fix').Strategy
    var exec = require('child_process').exec; 
    const async = require('async');
    //const request = require('request')
    const passport = require.main.require('passport');
    const nconf = require.main.require('nconf');
    const winston = require.main.require('winston');

    const OAuth = {};
    let configOk = false;



    const constants = Object.freeze({
        type: 'oauth2', 
        name: 'qq', 
        userRoute: '/plugins/oauth2-qq/', 
    });


    meta.settings.get('oauth2-qq', function (err, settings) {
    if (settings.login === 'on') {
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
            });
        }


        data.router.get('/admin/plugins/oauth2-qq', data.middleware.admin.buildHeader, renderAdmin)
        data.router.get('/api/admin/plugins/oauth2-qq', renderAdmin)

        data.router.get('/auth/qq/callback', function (req, res, next) {
            req.query.state = req.session.ssoState
            next()
        });

        
        
        if (nconf.get('appCallbackUrl') != null ){

        //app验证地址
        data.router.get('/auth/qq2', function (req, res) {
         if (configOk) {      
                meta.settings.get('oauth2-qq', function (err, settings) {
                    res.redirect("https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=" + settings.id + "&redirect_uri=" + nconf.get('url') + "/auth/qq/forward" + "&scope=get_user_info");
                });
            } 

        });

        //app验证回调中转地址，负责调起app
        data.router.get('/auth/qq/forward', function (req, res) {
            const code = req.query.code;

            res.render('plugins/oauth2-qq/forward', {
                code: code,
                appCallbackUrl: nconf.get('appCallbackUrl')
            });
        });



        //app最终回调地址
        data.router.get('/auth/qq/callback2', function (req, res) {
            const code = req.query.code;
            res.redirect(nconf.get('url') + "/auth/qq/callback?code=" + code);
        });

    }

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
            });
        });
        callback();
    };

    OAuth.addMenuItem = function (custom_header, callback) {
        custom_header.authentication.push({
            route: "/plugins/oauth2-qq",
            icon: 'fa-brands fa-qq',
            name: 'OAuth2 QQ',
        });

        callback(null, custom_header);
    };







    OAuth.getStrategy = function (strategies, callback) {
        if (configOk) {

            meta.settings.get('oauth2-qq', function (err, settings) {

                passport.use(constants.name, new QQStrategy({
                    clientID: settings.id, //读取管理面板设置
                    clientSecret: settings.key, 
                    callbackURL: nconf.get('url') + "/auth/qq/callback",
                    passReqToCallback: true
                }, function (req, accessToken, refreshToken, profile, done) {
                    try {
                        profile = JSON.parse(profile)
                    } catch (e) {
                        done(e)
                    }
                    if (profile.ret === -1) { // Try Catch Error
                        winston.error('[[oauth2-qq:profileError]]');
                        return done(new Error("[[oauth2-qq:oauthError]]"));
                    }

                    // 存储头像信息
                    let avatar = (profile.figureurl_qq_2 == null) ? profile.figureurl_qq_1 : profile.figureurl_qq_2 // Set avatar image
                    avatar = avatar.replace('http://', 'https://');

                    exec("mkdir ./public/uploads/qq/");

                    var cmdStr = 'wget "' + avatar + '" -O ./public/uploads/qq/' + profile.id + '.jpg';

                    exec(cmdStr, function (err, stdout, stderr) {

                        if (err) {
                            console.log('get qq avatar error:' + stderr);
                        } else {
                            console.log(stdout);
                        }

                    });

                    avatar = nconf.get('url') + "/assets/uploads/qq/" + profile.id + ".jpg";

                    // 如果用户已经登录，那么我们就绑定他
                    if (req.hasOwnProperty('user') && req.user.hasOwnProperty('uid') && req.user.uid > 0) {
                        // 如果用户想重复绑定的话，我们就拒绝他。
                        OAuth.hasQQID(profile.id, function (err, res) {
                            if (err) {
                                winston.error(err);
                                return done(err);
                            } else {
                                if (res) {
                                    winston.error('[[oauth2-qq:userExist]]');
                                    // qqid is exist
                                    return done(new Error('[[error:sso-multiple-association]]'));
                                } else {
                                    User.setUserField(req.user.uid, 'qqid', profile.id);
                                    db.setObjectField('qqid:uid', profile.id, req.user.uid);
                                    User.setUserField(req.user.uid, 'qqpic', avatar);
                                    winston.error('[[oauth2-qq:userExist]]');
                                    return done(null, req.user);
                                }
                            }

                        })
                    } else {
                        // 登录方法
                        var email = profile.id + '@noreply.qq.com';
                        OAuth.login(profile.id, profile.nickname, avatar, email, function (err, user) { // 3.29 add avatar
                            if (err) {
                                return done(err);
                            } else {

                                // Require collection of email
                                if (email.endsWith('@norelpy.qq.com') || email.endsWith('@noreply.qq.com')) {
                                    req.session.registration = req.session.registration || {}
                                    req.session.registration.uid = user.uid
                                    req.session.registration.qqid = profile.id
                                }
                                authenticationController.onSuccessfulLogin(req, user.uid, function (err) {
                                    if (err) {
                                        return done(err);
                                    } else {
                                        return done(null, user);
                                    }
                                })



                            }
                        })
                    }
                }))

                // 定义本插件的一些信息
                strategies.push({
                    name: 'qq',
                    url: `/auth/qq`,
                    callbackURL: `/auth/qq/callback`,
                    icon: 'fa-brands fa-qq',
                    icons: {
                        normal: 'fa-brands fa-qq',
                        square: 'fa-brands fa-qq',
                    },
                    color: '#25292f',
                    labels: {
                        login: '[[oauth2-qq:login]]',
                        register: '[[oauth2-qq:login]]',
                    },
                });

                callback(null, strategies);
            });

        } else {
            callback(new Error('[[oauth2-qq:configError]]'));
        }
    };


    OAuth.hasQQID = function (qqid, callback) {
        db.isObjectField(`qqid:uid`, qqid, function (err, res) {
            if (err) {
                callback(err);
            } else {
                callback(null, res);
            }
        })
    }


    OAuth.getAssociation = function (data, callback) {
        User.getUserField(data.uid, `qqid`, function (err, qqid) {
            if (err) {
                return callback(err, data);
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

            callback(null, data);
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
                return callback(err);
            }
            // winston.verbose("[oauth2-qq]uid:" + uid);
            if (uid !== null) {
                // Existing User
                winston.info('[[oauth2-qq:userExist]]');

                User.setUserField(uid, 'qqpic', avatar); // 更新头像

                callback(null, {
                    uid: uid
                });
            } else {
                //New User
                // 为了解决可能导致的修改用户数据，结果重新建立了一个账户的问题，所以我们给他一个默认邮箱
                winston.info("[[oauth2-qq:createUser]]");

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
                                return callback(err);
                            } else {
                                // Save qq-specific information to the user
                                User.setUserField(uid, 'qqid', qqID);
                                db.setObjectField('qqid:uid', qqID, uid);
                                // Save their photo, if present

                                if (avatar) {
                                    User.setUserField(uid, 'picture', avatar);
                                    User.setUserField(uid, 'qqpic', avatar);
                                }

                                callback(null, {
                                    uid: uid
                                });
                            }
                        });
                    } else {
                        // Save qq-specific information to the user
                        User.setUserField(uid, 'qqid', qqID);
                        db.setObjectField('qqid:uid', qqID, uid);
                        // Save their photo, if present

                        if (avatar) {
                        User.setUserField(uid, 'picture', avatar);
                        User.setUserField(uid, 'qqpic', avatar);
                        }
                        callback(null, {
                            uid: uid
                        });
                    }
                });
            }
        });
    }

    OAuth.deleteUserData = function (data, callback) {
        async.waterfall([
            async.apply(User.getUserField, data.uid, `qqid`),
            function (oAuthIdToDelete, next) {
                db.deleteObjectField(`qqid:uid`, oAuthIdToDelete, next);
            },
        ], (err) => {
            if (err) {
                winston.error(`[[oauth2-qq:removeError]] ${err}`);
                return callback(err);
            }

            callback(null, data);
        });
    };


    OAuth.prepareInterstitial = (data, callback) => {

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

                callback(null, data);
            });
        } else {
            callback(null, data);
        }
    }

    
    OAuth.get = (data, callback) => {
        if (data.type === 'qq') {
            OAuth.getQQPicture(data.uid, function (err, QQPicture) {
                if (err) {
                    winston.error(err);
                    return callback(null, data);
                }
                if (QQPicture == null) {
                    winston.error('[[oauth2-qq:uidInvalid]]');
                    return callback(null, data);
                }
                data.picture = QQPicture;
                callback(null, data);
            })
        } else {
            callback(null, data);
        }
    }



    OAuth.list = (data, callback) => {
        OAuth.getQQPicture(data.uid, function (err, QQPicture) {
            if (err) {
                winston.error(err);
                return callback(null, data);
            }
            if (QQPicture == null) {
                winston.error('[[oauth2-qq:uidInvalid]]');
                return callback(null, data);
            }
            data.pictures.push({
                type: 'qq',
                url: QQPicture,
                text: 'QQ头像'
            });
            callback(null, data);
        });
    }

    OAuth.getQQPicture = function (uid, callback) {
        User.getUserField(uid, 'qqpic', function (err, pic) {
            if (err) {
                return callback(err);
            }
            callback(null, pic);
        });
    }


    OAuth.appendUserHashWhitelist = function (data, callback) {
        data.whitelist.push('qqid');
        data.whitelist.push('qqpic')
        setImmediate(callback, null, data);
    };

    OAuth.storeAdditionalData = function (userData, data, callback) {
        async.waterfall([
            // Reset email confirm throttle
            async.apply(db.delete, 'uid:' + userData.uid + ':confirm:email:sent'),
            async.apply(User.getUserField, userData.uid, 'email'),
            function (email, next) {
                // Remove the old email from sorted set reference
                email = email.toLowerCase();
                db.sortedSetRemove('email:uid', email, next);
            },
            async.apply(User.setUserField, userData.uid, 'email', data.email),
            async.apply(User.email.sendValidationEmail, userData.uid, data.email)
        ], callback);
    }


    module.exports = OAuth;

}(module));