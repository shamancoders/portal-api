module.exports = (dbModel, member, req, res, next, cb)=>{
	switch(req.method){
		case 'GET':
		if(req.params.param1!=undefined){
			getOne(dbModel, member, req, res, next, cb)
		}else{
			getList(dbModel, member, req, res, next, cb)
		}
		break
		case 'POST':
		if(req.params.param1=='copy'){
			copy(dbModel, member, req, res, next, cb)
		}else{
			post(dbModel, member, req, res, next, cb)
		}
		break
		case 'PUT':
		put(dbModel, member, req, res, next, cb)
		break
		case 'DELETE':
		deleteItem(dbModel, member, req, res, next, cb)
		break
		default:
		error.method(req, next)
		break
	}
}


function copy(dbModel, member, req, res, next, cb){
	let id=req.params.param2 || req.body['id'] || req.query.id || ''
	let newName=req.body['newName'] || req.body['name'] || ''

	if(id=='')
		return error.param1(req,next)

	dbModel.print_designs.findOne({ _id: id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				let data=doc.toJSON()
				data._id=undefined
				delete data._id
				if(newName!=''){
					data.name=newName
				}else{
					data.name +=' copy'
				}
				data.createdDate=new Date()
				data.modifiedDate=new Date()
				let newDoc = new dbModel.print_designs(data)
				if(!epValidateSync(newDoc,next))
					return
				newDoc.save((err, newDoc2)=>{
					if(dberr(err,next)){
						let obj=newDoc2.toJSON()
						obj['newName']=data.name
						cb(obj)
					} 
				})
			}
		}
	})
}

function getList(dbModel, member, req, res, next, cb){
	let options={page: (req.query.page || 1)
		,select:'-design'
	}

	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit

	let filter = {}

	if((req.query.module || '')!='')
		filter['module']=req.query.module
	if((req.query.function || '')!='')
		filter['function']=req.query.function

	if((req.query.passive || '')!='')
		filter['passive']=req.query.passive

	if((req.query.name || '')!='')
		filter['name']={ $regex: '.*' + req.query.name + '.*' ,$options: 'i' }

	
	if((req.query.search || '')!='')
		filter['name']={ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }

	dbModel.print_designs.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getOne(dbModel, member, req, res, next, cb){
	dbModel.print_designs.findOne({_id:req.params.param1},(err,doc)=>{
		if(dberr(err,next)){
			cb(doc)
		}
	})
}

function post(dbModel, member, req, res, next, cb){
	let data = req.body || {}
	data._id=undefined

	let newDoc = new dbModel.print_designs(data)
	if(!epValidateSync(newDoc,next))
		return
	newDoc.save((err, newDoc2)=>{
		if(dberr(err,next)){
			cb(newDoc2)
		} 
	})
}

function put(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	
	let data = req.body || {}
	data._id = req.params.param1
	data.modifiedDate = new Date()

	dbModel.print_designs.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				let doc2 = Object.assign(doc, data)
				let newDoc = new dbModel.print_designs(doc2)
				if(!epValidateSync(newDoc,next))
					return
				newDoc.save((err, newDoc2)=>{
					if(dberr(err,next)){
						cb(newDoc2)
					} 
				})
			}
		}
	})
}

function deleteItem(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	let data = req.body || {}
	data._id = req.params.param1
	dbModel.print_designs.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
}
