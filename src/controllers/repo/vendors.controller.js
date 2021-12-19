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
		return error.param2(req,next)

	dbModel.parties.findOne({ _id: id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				let data=doc.toJSON()
				data._id=undefined
				delete data._id

				if(newName!=''){
					data.partyName.name.value=newName
				}else{
					data.partyName.name.value +=' copy'
				}

				data.createdDate=new Date()
				data.modifiedDate=new Date()

				let newDoc = new dbModel.parties(data)
				if(!epValidateSync(newDoc,next))
					return

				newDoc.save((err, newDoc2)=>{
					if(dberr(err,next)){
						let obj=newDoc2.toJSON()
						obj['newName']=data.partyName.name.value
						cb(obj)
					} 
				})
			}
		}
	})
}

function getList(dbModel, member, req, res, next, cb){
	let options={page: (req.query.page || 1)}
	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit

	let filter = {partyType:{$in:['Vendor','Both']}}


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
	
	dbModel.parties.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			resp.docs.forEach((e)=>{
				e.vknTckn=''
				e.mersisNo=''
				e.partyIdentification.forEach((e2)=>{
					switch(e2.ID.attr.schemeID.toUpperCase()){
						case 'VKN':
						case 'TCKN':
						e.vknTckn=e2.ID.value
						break
						case 'MERSISNO':
						case 'MERSİSNO':
						e.mersisNo=e2.ID.value
						break
					}
				})
			})
			cb(resp)
		}
	})
}

function getOne(dbModel, member, req, res, next, cb){
	dbModel.parties.findOne({_id:req.params.param1},(err,doc)=>{
		if(dberr(err,next)){
			cb(doc)
		}
	})
}

function post(dbModel, member, req, res, next, cb){
	let data = req.body || {}
	data._id=undefined

	if((data.account || '')=='')
		data.account=undefined

	let newDoc = new dbModel.parties(data)
	newDoc.partyType=newDoc.partyType || 'Vendor'
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

	if((data.account || '')=='')
		data.account=undefined

	dbModel.parties.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				// if(doc.partyType!='Vendor' && doc.partyType!='Both' && doc.partyType!='Agency')
				// 	return next({code: 'WRONG_PARAMETER', message: 'Yanlis partyType'})

				let doc2 = Object.assign(doc, data)
				let newDoc = new dbModel.parties(doc2)
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
	dbModel.parties.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
}