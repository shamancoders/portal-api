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
		if(req.params.param1=='generate'){
			generate(dbModel, member, req, res, next, cb)
		}else if(req.params.param1=='nogenerate'){
			nogenerate(dbModel, member, req, res, next, cb)
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

function generate(dbModel, member, req, res, next, callback){
	let data = req.body || {}
	if(data.list==undefined)
		return next({code: 'ERROR', message: 'list is required.'})
	
	let idList=[]
	data.list.forEach((e)=>{
		if(e && typeof e === 'object' && e.constructor === Object){
			if(e._id!=undefined){
				idList.push(e._id)
			}else if(e.id!=undefined){
				idList.push(e.id)
			}else{
				return next({code: 'ERROR', message: 'list is wrong.'})
			}
		}else{
			idList.push(e)
		}
	})
	let filter={_id:{$in:idList}}

	dbModel.autonew_items.find(filter,(err,docs)=>{
		if(dberr(err,next)){
			let basarili=0
			iteration(docs,(doc,cb)=>{
				dbModel.items.findOne({'name.value':doc.name.value},(err,itemDoc)=>{
					if(!err){
						if(itemDoc==null){
							let data=doc.toJSON()
							data._id=undefined
							let newDoc=new dbModel.items(data)
							newDoc.save((err,newDoc2)=>{
								if(!err){
									basarili++
									dbModel.autonew_items.updateOne({_id:doc._id},{$set:{generated:true,itemId:newDoc2._id}},()=>{
										cb()
									})
								}else{
									cb()
								}
							})
						}else{
							cb()
						}
					}else{
						cb()
					}
				})
			},0,true,(err)=>{
				callback(`${basarili} adet kayıt oluşturuldu`)
			})

		}
	})
}

function nogenerate(dbModel, member, req, res, next, cb){
	let data = req.body || {}
	if(data.list==undefined)
		return next({code: 'ERROR', message: 'list is required.'})

	let idList=[]
	data.list.forEach((e)=>{
		if(e && typeof e === 'object' && e.constructor === Object){
			if(e._id!=undefined){
				idList.push(e._id)
			}else if(e.id!=undefined){
				idList.push(e.id)
			}else{
				return next({code: 'ERROR', message: 'list is wrong.'})
			}
		}else{
			idList.push(e)
		}
	})
	let filter={_id:{$in:idList}}
	dbModel.autonew_items.updateMany(filter,{$set:{cancelled:true}},{multi:true},(err,c)=>{
		if(dberr(err,next)){
			cb(`${c.n} kayıt iptal edildi`)
		}
	})
}

function getList(dbModel, member, req, res, next, cb){
	let options={page: (req.query.page || 1)
		
	}
	
	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit
	
	let filter = {cancelled:false,generated:false}
	options.sort={
		'name.value':1
	}

	//if(req.query.itemType!='all'){
		if((req.query.itemType || req.query.itemtype || req.query.type || '')!=''){
			filter['itemType']=(req.query.itemType || req.query.itemtype || req.query.type)
		}

		// else{
		// 	filter['itemType']='item'
		// }
	//}


	if((req.query.passive || '')!='')
		filter['passive']=req.query.passive


	if((req.query.name || req.query['name.value'] || '')!='')
		filter['name.value']={ $regex: '.*' + (req.query.name || req.query['name.value']) + '.*' ,$options: 'i' }

	if((req.query.description  || req.query['description.value'] || '')!='')
		filter['description.value']={ $regex: '.*' + (req.query.description  || req.query['description.value']) + '.*' ,$options: 'i' }


	if((req.query.brandName || req.query['brandName.value'] || '')!='')
		filter['brandName.value']={ $regex: '.*' + (req.query.brandName || req.query['brandName.value']) + '.*' ,$options: 'i' }



	if((req.query.keyword || req.query['keyword.value'] || '')!='')
		filter['keyword.value']={ $regex: '.*' + (req.query.keyword || req.query['keyword.value']) + '.*' ,$options: 'i' }

	if((req.query.modelName || req.query['modelName.value'] || '')!='')
		filter['modelName.value']={ $regex: '.*' + (req.query.modelName || req.query['modelName.value']) + '.*' ,$options: 'i' }

	if((req.query.search || '').trim()!=''){
		filter['$or']=[
		{'name.value':{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }},
		{'description.value':{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }},
		{'brandName.value':{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }},
		{'keyword.value':{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }},
		{'modelName.value':{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }}
		]
	}
	if((req.query.itemClassificationCode || req.query['itemClassificationCode.value'] || '')!='')
		filter['commodityClassification.itemClassificationCode.value']={ $regex: '.*' + (req.query.itemClassificationCode || req.query['itemClassificationCode.value']) + '.*' ,$options: 'i' }


	if((req.query.accountGroup || '')!='')
		filter['accountGroup']=req.query.accountGroup

	if((req.query.lotNo || req.query['tracking.lotNo'] || '')!='')
		filter['tracking.lotNo']=req.query.lotNo || req.query['tracking.lotNo']

	if((req.query.serialNo || req.query['tracking.serialNo'] || '')!='')
		filter['tracking.serialNo']=req.query.serialNo || req.query['tracking.serialNo']

	if((req.query.color || req.query['tracking.color'] || '')!='')
		filter['tracking.color']=req.query.color || req.query['tracking.color']

	if((req.query.pattern || req.query['tracking.pattern'] || '')!='')
		filter['tracking.pattern']=req.query.pattern || req.query['tracking.pattern']

	if((req.query.size || req.query['tracking.size'] || '')!='')
		filter['tracking.size']=req.query.size || req.query['tracking.size']

	dbModel.autonew_items.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getOne(dbModel, member, req, res, next, cb){
	let populate=[
	{path:'images',select:'_id name extension fileName data type size createdDate modifiedDate'},
	{path:'files',select:'_id name extension fileName data type size createdDate modifiedDate'},
	{path:'packingOptions.packingType',select:'_id name description width length height weight maxWeight'},
	{path:'packingOptions.packingType2',select:'_id name description width length height weight maxWeight'},
	{path:'packingOptions.packingType3',select:'_id name description width length height weight maxWeight'},
	{path:'packingOptions.palletType',select:'_id name description width length height maxWeight'}
	]
	dbModel.autonew_items.findOne({_id:req.params.param1}).populate(populate).exec((err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				cb(doc)
			}
		}
	})
}

function post(dbModel, member, req, res, next, cb){
	let data = req.body || {}
	data._id=undefined

	data=dataDuzenle(data,req)

	let newDoc = new dbModel.autonew_items(data)
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
	let data=req.body || {}
	data._id = req.params.param1
	data.modifiedDate = new Date()
	data=dataDuzenle(data,req)

	dbModel.autonew_items.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				let doc2 = Object.assign(doc, data)
				let newDoc = new dbModel.autonew_items(doc2)
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

function dataDuzenle(data,req){
	if((data.accountGroup || '')=='')
		data.accountGroup=undefined

	if(!Array.isArray(data.unitPacks)){
		if(typeof data.unitPacks!='object'){
			data.unitPacks=[]
		}
	}

	if(!Array.isArray(data.vendors)){
		if(typeof data.vendors!='object'){
			data.vendors=[]
		}
	}

	if((req.query.itemType || '')!=''){
		data['itemType']=req.query.itemType
	}

	return data
}

function deleteItem(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	let data = req.body || {}
	data._id = req.params.param1
	dbModel.autonew_items.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
}

