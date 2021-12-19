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

	dbModel.autonew_parties.find(filter,(err,docs)=>{
		if(dberr(err,next)){
			let basarili=0
			iteration(docs,(doc,cb)=>{
				dbModel.parties.findOne({'partyName.name.value':doc.partyName.name.value},(err,itemDoc)=>{
					if(!err){
						if(itemDoc==null){
							let data=doc.toJSON()
							data._id=undefined
							let newDoc=new dbModel.parties(data)
							newDoc.save((err,newDoc2)=>{
								if(!err){
									basarili++
									dbModel.autonew_parties.updateOne({_id:doc._id},{$set:{generated:true,partyId:newDoc2._id}},()=>{
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
	dbModel.autonew_parties.updateMany(filter,{$set:{cancelled:true}},{multi:true},(err,c)=>{
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
		'partyName.name.value':1
	}


	if((req.query.partyType || req.query.type || '')!='')
		filter['partyType']=req.query.partyType || req.query.type

	if((req.query.passive || '')!='')
		filter['passive']=req.query.passive

	if((req.query.name || req.query.partyName || '')!='')
		filter['partyName.name.value']={ $regex: '.*' + (req.query.name || req.query.partyName) + '.*' ,$options: 'i' }


	if((req.query.cityName || '')!='')
		filter['postalAddress.cityName.value']={ $regex: '.*' + req.query.cityName + '.*' ,$options: 'i' }

	if((req.query.district || '')!='')
		filter['postalAddress.district.value']={ $regex: '.*' + req.query.district + '.*' ,$options: 'i' }

	if((req.query.search || '').trim()!=''){
		filter['$or']=[
			{'partyName.name.value':{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }},
			{'postalAddress.district.value':{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }},
			{'postalAddress.cityName.value':{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }}
		]
	}

	dbModel.autonew_parties.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getOne(dbModel, member, req, res, next, cb){
	dbModel.autonew_parties.findOne({_id:req.params.param1},(err,doc)=>{
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

	let newDoc = new dbModel.autonew_parties(data)
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

	dbModel.autonew_parties.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				let doc2 = Object.assign(doc, data)
				let newDoc = new dbModel.autonew_parties(doc2)
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
	dbModel.autonew_parties.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
}

