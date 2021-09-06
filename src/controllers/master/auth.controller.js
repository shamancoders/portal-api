module.exports= function (member, req, res, next, cb) {
	auth.proxy(req,res,(err,data)=>{
		if(dberr(err,next)){
			cb(data)
		}
	})
}
