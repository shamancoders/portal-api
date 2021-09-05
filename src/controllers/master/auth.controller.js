module.exports= function (member, req, res, next, cb) {
	if(req.method=='GET' || req.method=='POST'){
		let body=req.body || {}
		let query=req.query || {}
		
	}else{
		error.method(req,next)
	}

}
