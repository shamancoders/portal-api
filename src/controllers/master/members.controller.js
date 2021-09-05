module.exports = (member, req, res, next, cb)=>{
	// if(req.params.param1==undefined)
	// 	error.param1(req)

	switch(req.method){
		case 'GET':
		if(req.params.param1!=undefined){
			if(req.params.param1.indexOf(',')>-1 || req.params.param1.indexOf(';')>-1){
				getIdList(member, req, res, next, cb)
			}else{
				getOne(member, req, res, next, cb)
			}
			
		}else{
			getList(member, req, res, next, cb)
		}
		break
		
		default:
		error.method(req,next)
		break
	}
}



function getOne(member,req,res,next,cb){
	var filter={_id:req.params.param1}

	db.members.findOne(filter).select('_id username name lastName').exec((err,doc)=>{
		if(dberr(err, next)){
			if(dbnull(doc, next)){
				cb(doc)
			}
		}
	})
}

function getList(member,req,res,next,cb){

	var options={ page: 1, limit:5, select:'_id username name lastName'}
	

	var filter={
		_id:{$ne:member._id},
		passive:false		
	}

	if((req.query.search || '').trim()!=''){
		filter['$or']=[
		{name:{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }},
		{lastName:{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }},
		{username:{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }}
		]
	}

	db.members.paginate(filter,options,(err, resp)=>{
		if(dberr(err, next)){
			cb(resp)
		}
	})
}

function getIdList(member, req, res, next, cb){
	
	var filter = {}
	var idList=req.params.param1.replaceAll(';',',').split(',')

	filter['_id']={$in:idList}

	db.members.find(filter).select('_id username name lastName').exec((err, docs)=>{
		if(dberr(err,next)){
			cb(docs)
		}
	})
}