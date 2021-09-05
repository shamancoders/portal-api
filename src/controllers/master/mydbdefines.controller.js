var helper=require('./mydbdefines.helper')
module.exports = (member, req, res, next, cb)=>{

	switch(req.method){
		case 'GET':
		if(req.params.param1!=undefined){
			helper.getOne(member,req,res,next,cb)
		}else{
			helper.getList(member,req,res,next,cb)
		}
		
		break
		
		default:
		error.method(req,next)
		break
	}
}
