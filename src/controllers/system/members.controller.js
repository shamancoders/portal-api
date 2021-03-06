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
	let options={
		page: (req.query.page || 1)
	}
	if(!req.query.page){
		options.limit=50000
	}
	let filter = {}
	if(req.query.username){
		filter['username']={ $regex: '.*' + req.query.username + '.*' ,$options: 'i' }
	}
	db.portal_members.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getOne(member,req,res,cb){
	db.portal_members.findOne({_id:req.params.param1},(err,doc)=>{
		if(dberr(err,next)){
			cb(doc)
		}
	})
}

function post(member,req,res,cb){
	let data = req.body || {}
	
	let newDoc = new db.portal_members(data)
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
		let data = req.body || {}
		
		data._id = req.params.param1
		data.modifiedDate = new Date()

		db.portal_members.findOne({ _id: data._id},(err,doc)=>{
			if(dberr(err,next))
				if(dbnull(doc,next)){
					
					let doc2 = Object.assign(doc, data)
					let newDoc = new db.portal_members(doc2)
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
	
	let data = req.body || {}
	data._id = req.params.param1
	db.portal_members.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
	
}
