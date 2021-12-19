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
	let filter={_id:req.params.param1}

	db.portal_members.findOne(filter).select('_id username name lastName').exec((err,doc)=>{
		if(dberr(err, next)){
			if(dbnull(doc, next)){
				cb(doc)
			}
		}
	})
}

function getList(member,req,res,next,cb){

	let options={ page: 1, limit:5, select:'_id username name lastName'}
	

	let filter={
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

	db.portal_members.paginate(filter,options,(err, resp)=>{
		if(dberr(err, next)){
			cb(resp)
		}
	})
}

function getIdList(member, req, res, next, cb){
	
	let filter = {}
	let idList=req.params.param1.replaceAll(';',',').split(',')

	filter['_id']={$in:idList}

	db.portal_members.find(filter).select('_id username name lastName').exec((err, docs)=>{
		if(dberr(err,next)){
			cb(docs)
		}
	})
}