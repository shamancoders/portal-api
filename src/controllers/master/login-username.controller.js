module.exports= function (member, req, res, next, cb) {
	if(req.method=='GET' || req.method=='POST'){
		var username= util.clearText(req.body.username || req.query.username || '')
		var IP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || ''
		if(username.trim()=='')
			return next({code:'USERNAME_EMPTY',message:'Kullanıcı bilgisi(email,username,telefon) boş olamaz.'})
		
		db.members.findOne({username:username},(err,doc)=>{
			if(dberr(err,next)){
				if(doc!=null){
					cb({_id:doc._id,username:doc.username,passive:doc.passive})
				}else{
					next({code:'NOT_FOUND',message:'Kullanıcı bulunamadı'})
				}
			}
		})
	}else{
		error.method(req,next)
	}

}
