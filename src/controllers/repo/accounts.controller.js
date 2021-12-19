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

	dbModel.accounts.findOne({ _id: id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				let data=doc.toJSON()
				data._id=undefined
				delete data._id
				if(newName!='')
					data.name=newName
				else
					data.name +=' copy'

				yeniHesapKodu(dbModel,doc,(err,yeniKod)=>{
					if(dberr(err,next)){
						data.code=yeniKod
						let newDoc = new dbModel.accounts(data)
						if(!epValidateSync(newDoc,next))
							return
						newDoc.balanceAmount=0
						newDoc.balanceQuantity=0
						newDoc.balanceReports={}
						newDoc.createdDate=new Date()
						newDoc.modifiedDate=new Date()
						
						newDoc.save((err, newDoc2)=>{
							if(dberr(err,next)){
								let obj=newDoc2.toJSON()
								obj['newName']=data.name
								cb(obj)
							}
						})
					}
				})

			}
		}
	})
}

function yeniHesapKodu(dbModel,sourceDoc,cb){
	dbModel.accounts.find({parentAccount: (sourceDoc.parentAccount || null), code:{$ne:''}}).sort({code:-1}).limit(1).exec((err,docs)=>{
		if(dberr(err,cb)){
			if(docs.length==0)
				return cb(null,'001')
			cb(null,util.incString(docs[0].code))
		}
	})
}

function getList(dbModel, member, req, res, next, cb){
	let options={page: (req.query.page || 1),
		sort:{accountCode:1}
	}
	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit
	if((req.query.pageSize || req.query.limit)){
		options['limit']=req.query.pageSize || req.query.limit
	}

	let filter = {}

	if((req.query.code || req.query.accountCode || '')!='')
		filter['accountCode']={ $regex: '' + (req.query.code || req.query.accountCode) + '.*' ,$options: 'i' }
	
	if((req.query.name || '')!='')
		filter['name']={ $regex: '.*' + req.query.name + '.*' ,$options: 'i' }

	if((req.query.search || '').trim()!=''){
		filter['$or']=[
		{name:{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }},
		{accountCode:{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }}
		]
	}
	
	dbModel.accounts.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}


function getIdList(dbModel, member, req, res, next, cb){
	
	let filter = {}
	let idList=req.params.param1.replaceAll(';',',').split(',')

	filter['_id']={$in:idList}

	dbModel.accounts.find(filter,(err, docs)=>{
		if(dberr(err,next)){
			cb(docs)
		}
	})
}

function getOne(dbModel, member, req, res, next, cb){
	dbModel.accounts.findOne({_id:req.params.param1}).populate([{path:'parentAccount',select:'_id accountCode name'}]).exec((err,doc)=>{
		if(dberr(err,next)){
			let obj=clone(doc.toJSON())
			if(obj.parentAccount){
				obj['pop_parentAccount']=obj['parentAccount']
				obj['parentAccount']=doc.parentAccount._id
			}else{
				obj['pop_parentAccount']={_id:'', accountCode:'', name:''}
			}
			cb(obj)
		}
	})
}

function post(dbModel, member, req, res, next, cb){
	let data = req.body || {}
	data._id=undefined

	if((data.parentAccount || '')=='')
		data.parentAccount=undefined

	let newDoc = new dbModel.accounts(data)

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

	dbModel.accounts.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				console.log(`data:`,data)
				let newDoc = Object.assign(doc, data)
				if(!data.parentAccount){
					newDoc.parentAccount=undefined

				}
				// var newDoc = new dbModel.accounts(doc2)
				// console.log(`newDoc:`,newDoc)
				if(!epValidateSync(newDoc,next))
					return
				console.log(`newDoc:`,newDoc)
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
	dbModel.accounts.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next))
			cb(null)
	})
}
