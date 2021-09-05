module.exports= function (member, req, res, next, cb) {
	if(req.method=='GET' || req.method=='POST'){
		// var username= util.clearText(req.body.username || req.query.username || '')
		var username= req.body.username || req.query.username || ''
		
		if(username.trim()=='')
			return next({code:'USERNAME_EMPTY',message:'Kullanıcı bilgisi(email,username,telefon) boş olamaz.'})
		
		if(username.length>5 && username.substr(-5)=='@root'){
			sysLogin(member, req, res, next, cb)
		}else{
			memberLogin(member, req, res, next, cb)
		}
	}else{
		error.method(req,next)
	}

}

function memberLogin(member, req, res, next, cb){
	var username= req.body.username || req.query.username || ''
	var password= req.body.password || req.query.password || ''
	var IP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || ''

	// var helper=require('./mydbdefines.helper')

	db.members.findOne({username:username , password:password},(err,doc)=>{
		if(dberr(err, next)){
			if(doc==null)
				return next( {code:'LOGIN_FAILED',message:'Giriş başarısız'})
			if(doc.passive) 
				return next( {code:'USER_PASSIVE',message:'Kullanici pasif duruma alinmis.'})
			if(!doc.verified) 
				return next( {code:'USER_NOT_VERIFIED',message:'Kullanici onay kodu alinmamis.'})

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
				token=jwt.sign(userinfo, config.secretWord, {expiresIn: 5*365*1440*60})
			}else{
				token=jwt.sign(userinfo, config.secretWord, {expiresIn: 30*1440*60})
			}
			cb({username:doc.username, name:doc.name, lastName:doc.lastName,gender:doc.gender, isSysUser:false,isMember:true, role:doc.role, token:token})
			// helper.getList(userinfo,req,res,next,(databases)=>{
			// 	cb({username:doc.username, name:doc.name, lastName:doc.lastName,gender:doc.gender, isSysUser:false,isMember:true, role:doc.role, token:token,databases:databases})
			// })

		}
	})
}

function sysLogin(member, req, res, next, cb){
	var username= req.body.username || req.query.username || ''
	var password= req.body.password || req.query.password || ''
	var IP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || ''
	if(username.trim()=='')
		return next({code:'USERNAME_EMPTY',message:'Kullanıcı bilgisi(email,username,telefon) boş olamaz.'})


	username=username.substr(0,username.length-5)
	db.sysusers.findOne({username:username,password:password},(err,doc)=>{
		if(dberr(err, next)){
			if(doc==null)
				return next( {code:'LOGIN_FAILED',message:'Giriş başarısız'})
			if(doc.passive) 
				return next( {code:'USER_PASSIVE',message:'Kullanici pasif duruma alinmis.'})
			var userinfo = { 
				_id : doc._id,
				username: doc.username,
				name: doc.name,
				lastName: doc.lastName,
				gender: doc.gender,
				role : doc.role,
				isSysUser:true,
				isMember:false,
				auth:doc.auth,
				ip: IP
			}

			var token
			var jwt = require('jsonwebtoken')
			token=jwt.sign(userinfo, 'gizliSir', {expiresIn: 30*1440*60})
			cb({username:doc.username, isSysUser:true,isMember:false, role:doc.role, token:token})
		}
	})
}