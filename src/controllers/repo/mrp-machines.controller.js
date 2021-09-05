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
	var options={page: (req.query.page || 1)
	}

	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit

	var filter = {}

	if((req.query.passive || '')!='')
		filter['passive']=req.query.passive

	if(req.query.name)
		filter['name']={ $regex: '.*' + req.query.name + '.*' ,$options: 'i' }

	if(req.query.description)
		filter['description']={ $regex: '.*' + req.query.description + '.*' ,$options: 'i' }

	if((req.query.station || '')!='')
		filter['station']=req.query.station

	if((req.query.machineType || '')!='')
		filter['machineType']=req.query.machineType

	if((req.query.machineGroup || '')!='')
		filter['machineGroup']=req.query.machineGroup

	if((req.query.recipe || '')!=''){
		dbModel.recipes.findOne({_id:req.query.recipe},(err,recipeDoc)=>{
			if(dberr(err,next)){
				if(dbnull(recipeDoc,cb)) {
					var dizi=[]
					var processIndex=-1
					if((req.query.processIndex || '')!='') processIndex=Number(req.query.processIndex)

						recipeDoc.process.forEach((e,index)=>{
							if(processIndex<0 || processIndex==index){
								e.machines.forEach((e2)=>{
									dizi.push(e2.machineGroup)    
								})
							}
						})

					filter['machineGroup']={$in:dizi}
					dbModel.mrp_machines.paginate(filter,options,(err, resp)=>{
						if(dberr(err,next)){
							cb(resp)
						}
					})

				}
			}
		})

	}else{
		dbModel.mrp_machines.paginate(filter,options,(err, resp)=>{
			if(dberr(err,next)){
				cb(resp)
			}
		})
	}
}

function getOne(dbModel, member, req, res, next, cb){
	dbModel.mrp_machines.findOne({_id:req.params.param1},(err,doc)=>{
		if(dberr(err,next)){
			cb(doc)
		}
	})
}

function post(dbModel, member, req, res, next, cb){
	var data = req.body || {}
	data._id=undefined
	if((data.account || '')=='')
		data.account=undefined

	var newDoc = new dbModel.mrp_machines(data)
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

	var data = req.body || {}
	data._id = req.params.param1
	data.modifiedDate = new Date()


	dbModel.mrp_machines.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				var doc2 = Object.assign(doc, data)
				var newDoc = new dbModel.mrp_machines(doc2)
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
	var data = req.body || {}
	data._id = req.params.param1
	dbModel.mrp_machines.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
}
