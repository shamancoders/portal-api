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

function getList(dbModel, member, req, res, next, cb){
	var options={page: (req.query.page || 1),
		sort:{name:1}
	}
	if(!req.query.page){
		options.limit=50000
	}
	var filter = {}

	if((req.query.name || '')!=''){
		filter['$or']=[
		{name:{ $regex: '.*' + req.query.name + '.*' ,$options: 'i' }},
		{description:{ $regex: '.*' + req.query.name + '.*' ,$options: 'i' }}
		]
	}
	if((req.query.description || '')!='')
		filter['description']={ $regex: '.*' + req.query.description + '.*' ,$options: 'i' }

	if((req.query.width || '')!='')
		filter['width']=req.query.width

	if((req.query.length || '')!='')
		filter['length']=req.query.length

	if((req.query.height || '')!='')
		filter['height']=req.query.height

	if((req.query.maxWeight || '')!='')
		filter['maxWeight']=req.query.maxWeight

	dbModel.pallet_types.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getOne(dbModel, member, req, res, next, cb){
	dbModel.pallet_types.findOne({_id:req.params.param1},(err,doc)=>{
		if(dberr(err,next)){
			cb(doc)
		}
	})
}

function post(dbModel, member, req, res, next, cb){
	var data = req.body || {}
	data._id=undefined

	var newDoc = new dbModel.pallet_types(data)
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
	var data=req.body || {}
	data._id = req.params.param1
	data.modifiedDate = new Date()

	dbModel.pallet_types.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				var doc2 = Object.assign(doc, data)
				var newDoc = new dbModel.pallet_types(doc2)
				if(!epValidateSync(newDoc,next))
					return

				newDoc.save((err, newDoc2)=>{
					if(dberr(err,next))
						cb(newDoc2)
				})
			}
		}
	})
}

function deleteItem(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	var data = req.body || {}
	data._id = req.params.param1
	dbModel.pallet_types.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
}
