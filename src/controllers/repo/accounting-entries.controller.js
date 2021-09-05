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
	var id=req.params.param2 || req.body['id'] || req.query.id || ''
	var newName=req.body['newName'] || req.body['name'] || ''

	if(id=='')
		return error.param2(req,next)

	dbModel.accounting_entries.findOne({ _id: id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				var data=doc.toJSON()
				data._id=undefined
				delete data._id
				if(newName!=''){
					data.name=newName
				}else{
					data.name +=' copy'
				}

				var newDoc = new dbModel.accounting_entries(data)
				if(!epValidateSync(newDoc,next))
					return

				newDoc.save((err, newDoc2)=>{
					if(dberr(err,next)){
						var obj=newDoc2.toJSON()
						obj['newName']=data.name
						cb(obj)
					}
				})
			}
		}
	})
}

function getList(dbModel, member, req, res, next, cb){
	var options={page: (req.query.page || 1),
		populate:[
		{path:'ledger',select:'_id ledgerYear ledgerPeriod uuid startJournalNumber endJournalNumber startJournalLineNumber endJournalLineNumber'}
		],
		sort:{documentDate:1},
		select:'-entryLine'
	}
	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit

	var filter = {}
	
	if((req.query.year || '')!=''){
		filter['year']=req.query.year
	}

	if((req.query.period || '')!=''){
		filter['period']=req.query.period
	}
	
	if((req.query.date1 || '')!='')
		filter['documentDate']={$gte:req.query.date1}

	if((req.query.date2 || '')!=''){
		if(filter['documentDate']){
			filter['documentDate']['$lte']=req.query.date2
		}else{
			filter['documentDate']={$lte:req.query.date2}
		}
	}

	// if((req.query.search || '').trim()!='')
	// 	filter['name']={ '$regex': '.*' + req.query.search + '.*' ,'$options': 'i' }

	dbModel.accounting_entries.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getIdList(dbModel, member, req, res, next, cb){
	
	var filter = {}
	var idList=req.params.param1.replaceAll(';',',').split(',')

	filter['_id']={$in:idList}

	dbModel.accounting_entries.find(filter).select('-entryLine').exec((err, docs)=>{
		if(dberr(err,next)){
			cb(docs)
		}
	})
}

function getOne(dbModel, member, req, res, next, cb){
	dbModel.accounting_entries.findOne({_id:req.params.param1}).exec((err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				cb(doc)
			}
		}
	})
}

function post(dbModel, member, req, res, next, cb){
	var data = req.body || {}
	data._id=undefined

	data=veriTemizle(data)


	var newDoc = new dbModel.accounting_entries(data)
	if(!epValidateSync(newDoc,next))
		return

	verileriKontrolEt(newDoc,(err,newDoc)=>{
		if(dberr(err,next)){
			newDoc.save((err, newDoc2)=>{
				if(dberr(err,next)){
					cb(newDoc2)
				}
			})
		}
	})
}

function put(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param2(req,next)

	var data=req.body || {}
	data._id = req.params.param1
	data.modifiedDate = new Date()

	data=veriTemizle(data)
	
	dbModel.accounting_entries.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				var doc2 = Object.assign(doc, data)
				var newDoc = new dbModel.accounting_entries(doc2)
				if(!epValidateSync(newDoc,next))
					return

				verileriKontrolEt(newDoc,(err,newDoc)=>{
					if(dberr(err,next)){
						newDoc.save((err, newDoc2)=>{
							if(dberr(err,next))
								cb(newDoc2)
						})
					}
				})
			}

		}
	})

}

function verileriKontrolEt(doc,cb){
	try{
		doc.totalDebit=0
		doc.totalCredit=0

		if(doc.entryLine){
			doc.entryLine.forEach((e)=>{
				doc.totalDebit+=(e.debit || 0)
				doc.totalCredit+=(e.credit || 0)
				
				
			})
		}
		
		if(doc.totalDebit!=doc.totalCredit){
			cb({code:'SYNTAX_ERROR',message:'Toplam borç ve alacak eşit değil.'})
		}else{
			cb(null,doc)
		}

	}catch(err){
		errorLog(err)
		cb(err)
	}

}

function veriTemizle(data){

	data.lineCountNumeric=(data.entryLine || []).length

	return data
}

function deleteItem(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	var data = req.body || {}
	data._id = req.params.param1
	dbModel.accounting_entries.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
}
