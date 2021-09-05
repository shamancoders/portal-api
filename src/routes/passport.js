var jwt = require('jsonwebtoken')
var exceptedFunc=['login','login-username','signup','register','verify','forgot-password','status','modules','portal-modules','cities','provinces']
module.exports= function (req, res,cb) {
	
	if(exceptedFunc.includes(req.params.func)){
		cb(null)
	}else{
		var token = req.body.token || req.query.token || req.headers['x-access-token']  || req.headers['token']
		if(token) {
			jwt.verify(token, config.secretWord, function (err, decoded) {
				if (err) 
					throw { code: 'FAILED_TOKEN', message: 'Yetki hatasi' }
				else 
					cb(decoded)
			})
		} else {
			throw {code:`WRONG NO_TOKEN_PROVIDED`, message:`Yetki hatasi`}
		}
	}
}
