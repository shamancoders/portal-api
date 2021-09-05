module.exports= function (member, req, res, next, cb) {
	auth.proxy(req,(err,data)=>{
		if(dberr(err,next)){
			cb(data)
		}
	})
}
