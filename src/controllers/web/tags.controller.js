module.exports = (member, req, res, next, cb)=>{
	switch(req.method){
		case 'GET':
		if(req.params.param1!=undefined){
			getOne(member,req,res,next,cb)
		}else{
			getList(member,req,res,next,cb)
		}
		break

		default:
		error.method(req,next)
		break
	}
}

function getList(member,req,res,next,cb){
	var options={page: (req.query.page || 1)
	}

	if((req.query.pageSize || req.query.limit)){
		options['limit']=req.query.pageSize || req.query.limit
	}


	var filter = {}

	if((req.query.search || '').trim()!=''){
		filter['$or']=[
		{'name':{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }},
		{'textTR':{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }},
		{'textEN':{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }}
		]
	}

	webDb.tags.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getOne(member,req,res,next,cb){

	db.tags.findOne({_id:req.params.param1, member:member._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(doc)
		}
	})
}
