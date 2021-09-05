module.exports= function (member, req, res, next, cb) {
	if(req.method=='GET' || req.method=='POST'){
		var IP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || ''

		var username = util.clearText(req.body.username || req.query.username || '')
		var authCode = util.clearText(req.body.authCode || req.query.authCode || '')
		var deviceid = util.clearText(req.body.deviceid || req.query.deviceid || '')
		var devicetoken = util.clearText(req.body.devicetoken || req.query.devicetoken || '')

		if(username.trim()=='')
			return next({code:'USERNAME_EMPTY',message:'Telefon numarasi veya email bos olamaz.'})
		
		db.members.findOne({username:username},function(err,doc){
			if(dberr(err, next))
				if(dbnull(doc, next)){
					if(doc.authCode==authCode){
						doc.verified=true
						doc.deviceid = deviceid
						doc.devicetoken = devicetoken

						doc.save((err,newDoc)=>{
							if(dberr(err, next)){
								var userinfo = { 
									_id : doc._id,
									username: doc.username,
									name: doc.name,
									lastName: doc.lastName,
									gender: doc.gender,
									role : doc.role,
									isSysUser:false,
									isMember:true,
									ip: IP
								}

								var token
								var jwt = require('jsonwebtoken')
								if(doc.isMobile){
									token=jwt.sign(userinfo, 'gizliSir', {expiresIn: 5*365*1440*60})
								}else{
									token=jwt.sign(userinfo, 'gizliSir', {expiresIn: 30*1440*60})
								}
								cb({username:doc.username, name:doc.name, lastName:doc.lastName,gender:doc.gender, isSysUser:false,isMember:true, role:doc.role, token:token,databases:[]})
							}
						})
					}else{
						return next({code:'AUTH_CODE_ERROR',message:'Onay kod hatali.'})
					}
				}
			})

	}else{
		error.method(req,next)
	}
}
