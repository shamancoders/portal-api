module.exports = (member, req, res, next, cb)=>{
	switch(req.method){
		case 'GET':
		if(req.params.param1){
			getOne(member,req,res,next,cb)
		}else{
			getList(member,req,res,next,cb)
		}
		break
		case 'POST':
		post(member,req,res,next,cb)
		break
		case 'PUT':
		put(member,req,res,next,cb)
		break
		default:
		error.method(req, next)
		break
	}
}

function getList(member,req,res,next,cb){
	var options={
		page: (req.query.page || 1)
	}
	if(!req.query.page){
		options.limit=50000
	}
	var filter = {}
	if(req.query.username){
		filter['username']={ $regex: '.*' + req.query.username + '.*' ,$options: 'i' }
	}
	db.members.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getOne(member,req,res,cb){
	db.members.findOne({_id:req.params.param1},(err,doc)=>{
		if(dberr(err,next)){
			cb(doc)
		}
	})
}

function post(member,req,res,cb){
	var data = req.body || {}
	
	var newDoc = new db.members(data)
	if(!epValidateSync(newDoc,next))
		return
	newDoc.save(function(err, newDoc2) {
		if(dberr(err,next)){
			cb(newDoc2)
		}
		
	})

	
}

function put(member,req,res,next,cb){
	if(req.params.param1==undefined){
		cb({success: false,error: {code: 'WRONG_PARAMETER', message: 'Para metre hatali'}})
	}else{
		var data = req.body || {}
		
		data._id = req.params.param1
		data.modifiedDate = new Date()

		db.members.findOne({ _id: data._id},(err,doc)=>{
			if(dberr(err,next))
				if(dbnull(doc,next)){
					
					var doc2 = Object.assign(doc, data)
					var newDoc = new db.members(doc2)
					if(!epValidateSync(newDoc,next))
					return
					newDoc.save(function(err, newDoc2) {
						if(dberr(err,next)){
							cb(newDoc2)
						}
					})
					
				}
				
			})
	}
}

function deleteItem(member,req,res,next,cb){
	if(req.params.param1==undefined)
		error.param1(req)
	
	var data = req.body || {}
	data._id = req.params.param1
	db.members.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
	
}
