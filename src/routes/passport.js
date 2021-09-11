var exceptedFunc=['auth','status','modules','portal-modules','cities','provinces']
module.exports= function (req, res,cb) {
	
	if(exceptedFunc.includes(req.params.func)){
		cb(null)
	}else{
		auth.request('/passport',req,res,(err,resp)=>{
			if(!err){
				// decoded
				cb(resp.data)
			}else{
				throw err
			}
		})
	}
}
