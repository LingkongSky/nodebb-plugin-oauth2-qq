# NODEBB-PLUGIN-OAUTH-QQ
This plugin work on Nodebb V3.x,support user login & register via Tencent.

本插件适用于Nodebb V3.x，支持用户通过腾讯互联进行登录 & 注册。

PS:This plugin can also use in the app(Webview).In app,you need change /auth/qq to /auth/qq2 and add the www.example.com/auth/qq/forward in your callbackurl list.And after that,the authorize code would transport in your app with the type of schema_url&code=xxxx.

注：本插件同样适用于app(Webview)端，app验证请将/auth/qq请求改写为/auth/qq2，随后将www.example.com/auth/qq/forward加入到回调域名中，随后认证码会以schema_url&code=xxxxxx的形式在调起app的同时传回


# SEE ALSO
https://github.com/julianlam/nodebb-plugin-sso-oauth
https://github.com/NodeBB-China/nodebb-plugin-sso-qq-fix
https://github.com/julianlam/nodebb-plugin-sso-google
https://github.com/julianlam/nodebb-plugin-sso-github
https://github.com/NodeBB/nodebb-plugin-quickstart