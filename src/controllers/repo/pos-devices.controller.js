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
		post(dbModel, member, req, res, next, cb)
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
	let options={page: (req.query.page || 1)
		, 
		populate:[
		{path:'location',select:'_id name'},
		{path:'service',select:'_id name serviceType'}
		// ,
		// {path:'localConnector',select:'_id name'}
		]
	}

	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit


	let filter = {}
	if((req.query.deviceSerialNo || '')!='')
		filter['deviceSerialNo']={ $regex: '.*' + req.query.deviceSerialNo + '.*' ,$options: 'i' }

	if((req.query.deviceModel || '')!='')
		filter['deviceModel']={ $regex: '.*' + req.query.deviceModel + '.*' ,$options: 'i' }

	if((req.query.location || '')!='')
		filter['location']=req.query.location

	if((req.query.service || '')!='')
		filter['service']=req.query.service

	// if((req.query.localConnector || '')!='')
	// 	filter['localConnector']=req.query.localConnector

	if((req.query.passive || '')!='')
		filter['passive']=req.query.passive

	dbModel.pos_devices.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getOne(dbModel, member, req, res, next, cb){
	dbModel.pos_devices.findOne({_id:req.params.param1},(err,doc)=>{
		if(dberr(err,next)){
			cb(doc)
		}
	})
}

function post(dbModel, member, req, res, next, cb){
	let data = req.body || {}
	data._id=undefined

	let newDoc = new dbModel.pos_devices(data)
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

	dbModel.pos_devices.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				let doc2 = Object.assign(doc, data)
				let newDoc = new dbModel.pos_devices(doc2)
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
	let data = req.body || {}
	data._id = req.params.param1
	dbModel.pos_devices.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
}
