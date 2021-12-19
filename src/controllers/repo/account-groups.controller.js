module.exports = (dbModel, member, req, res, next, cb)=>{

	switch(req.method){
		case 'GET':
		if(req.params.param1!=undefined){
			if(req.params.param1.indexOf(',')>-1 || req.params.param1.indexOf(';')>-1){
				getIdList(dbModel, member, req, res, next, cb)
			}else{
				getOne(dbModel, member, req, res, next, cb)
			}
			
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

	dbModel.account_groups.findOne({ _id: id},(err,doc)=>{
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

				let newDoc = new dbModel.account_groups(data)
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
	let options={page: (req.query.page || 1),
		populate:[
		{path:'account',select:'_id accountCode name'},
		{path:'salesAccount',select:'_id accountCode name'},
		{path:'returnAccount',select:'_id accountCode name'},

		{path:'exportSalesAccount',select:'_id accountCode name'},
		{path:'salesDiscountAccount',select:'_id accountCode name'},
		{path:'buyingDiscountAccount',select:'_id accountCode name'},
		{path:'costOfGoodsSoldAccount',select:'_id accountCode name'}
		],
		sort:{name:1}

	}
	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit

	let filter = {}

	if((req.query.name || '')!='')
		filter['name']={ '$regex': '.*' + req.query.name + '.*' ,'$options': 'i' }

	if((req.query.search || '').trim()!='')
		filter['name']={ '$regex': '.*' + req.query.search + '.*' ,'$options': 'i' }

	dbModel.account_groups.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getIdList(dbModel, member, req, res, next, cb){
	
	let filter = {}
	let idList=req.params.param1.replaceAll(';',',').split(',')

	filter['_id']={$in:idList}

	dbModel.account_groups.find(filter,(err, docs)=>{
		if(dberr(err,next)){
			cb(docs)
		}
	})
}

function getOne(dbModel, member, req, res, next, cb){
	dbModel.account_groups.findOne({_id:req.params.param1}).exec((err,doc)=>{
		if(dberr(err,next)){
			let obj=clone(doc.toJSON())
			if(obj.account){
				obj['pop_account']=obj['account']
				obj['account']=doc.account._id
			}else{
				obj['pop_account']={_id:'', accountCode:'', name:''}
			}

			if(obj.salesAccount){
				obj['pop_salesAccount']=obj['salesAccount']
				obj['salesAccount']=doc.salesAccount._id
			}else{
				obj['pop_salesAccount']={_id:'', accountCode:'', name:''}
			}

			if(obj.returnAccount){
				obj['pop_returnAccount']=obj['returnAccount']
				obj['returnAccount']=doc.returnAccount._id
			}else{
				obj['pop_returnAccount']={_id:'', accountCode:'', name:''}
			}

			if(obj.exportSalesAccount){
				obj['pop_exportSalesAccount']=obj['exportSalesAccount']
				obj['exportSalesAccount']=doc.exportSalesAccount._id
			}else{
				obj['pop_exportSalesAccount']={_id:'', accountCode:'', name:''}
			}

			if(obj.salesDiscountAccount){
				obj['pop_salesDiscountAccount']=obj['salesDiscountAccount']
				obj['salesDiscountAccount']=doc.salesDiscountAccount._id
			}else{
				obj['pop_salesDiscountAccount']={_id:'', accountCode:'', name:''}
			}

			if(obj.buyingDiscountAccount){
				obj['pop_buyingDiscountAccount']=obj['buyingDiscountAccount']
				obj['buyingDiscountAccount']=doc.buyingDiscountAccount._id
			}else{
				obj['pop_buyingDiscountAccount']={_id:'', accountCode:'', name:''}
			}

			if(obj.costOfGoodsSoldAccount){
				obj['pop_costOfGoodsSoldAccount']=obj['costOfGoodsSoldAccount']
				obj['costOfGoodsSoldAccount']=doc.costOfGoodsSoldAccount._id
			}else{
				obj['pop_costOfGoodsSoldAccount']={_id:'', accountCode:'', name:''}
			}

			cb(doc)
		}
	})
}

function post(dbModel, member, req, res, next, cb){
	let data = req.body || {}
	data._id=undefined

	data=veriTemizle(data)

	let newDoc = new dbModel.account_groups(data)
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
		return error.param2(req,next)

	let data=req.body || {}
	data._id = req.params.param1
	data.modifiedDate = new Date()

	data=veriTemizle(data)

	dbModel.account_groups.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				let doc2 = Object.assign(doc, data)
				let newDoc = new dbModel.account_groups(doc2)
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

function veriTemizle(data){
	if((data.account || '')=='')
		data.account=undefined
	if((data.salesAccount || '')=='')
		data.salesAccount=undefined
	if((data.returnAccount || '')=='')
		data.returnAccount=undefined
	if((data.exportSalesAccount || '')=='')
		data.exportSalesAccount=undefined
	if((data.salesDiscountAccount || '')=='')
		data.salesDiscountAccount=undefined
	if((data.buyingDiscountAccount || '')=='')
		data.buyingDiscountAccount=undefined
	if((data.costOfGoodsSoldAccount || '')=='')
		data.costOfGoodsSoldAccount=undefined
	return data
}

function deleteItem(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	let data = req.body || {}
	data._id = req.params.param1
	dbModel.account_groups.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
}
