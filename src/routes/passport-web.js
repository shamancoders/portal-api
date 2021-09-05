var jwt = require('jsonwebtoken')
var exceptedFunc=[]
module.exports= function (req, res,cb) {
	
	// if(exceptedFunc.includes(req.params.func)){
	// 	cb(null)
	// }else{
		var token = req.body.token || req.query.token || req.headers['x-access-token']  || req.headers['token']
		if(token){

			jwt.verify(token,  config.secretWord, function (err, decoded) {
				if(!err){
					cb(decoded)
				}else{
					cb(null)
				}
			})
		} else {
			cb(null)
		}
	// }
}
