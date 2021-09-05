module.exports = (dbModel, member, req, res, next, cb)=>{
	
	switch(req.method){
		case 'GET':
		return get()
		break
		case 'POST':
		if(req.params.param1=='copy'){
			copy(dbModel, member, req, res, next, cb)
		}else{
			return postData()
		}
		break
		case 'PUT':
		return put(dbModel, member, req, res, next, cb)
		break
		case 'DELETE':
		deleteItem(dbModel, member, req, res, next, cb)
		break
		default:
		return error.method(req, next)
		break
	}

	function get(){
		switch(req.params.param1.lcaseeng()){
			case 'inbox':
			return getOrderList(1, dbModel, member, req, res, next, cb)
			break
			case 'outbox':
			return getOrderList(0, dbModel, member, req, res, next, cb)
			break
			case 'print':
			return print(dbModel, member, req, res, next, cb)
			break
			
			case 'errors':
			return getErrors(dbModel, member, req, res, next, cb)

			default:
			return getOrder(dbModel, member, req, res, next, cb)
		}
	}

	function postData(){
		if(req.params.param1!=undefined){
			switch(req.params.param1.lcaseeng()){
				case 'send':
				if(req.params.param2!=undefined){
					eOrderService.post(dbModel,`/send/${req.params.param2}`,req.body,(err,data)=>{
						if(dberr(err,next)){
							cb(data)
						}
					})
				}else{
					eOrderService.post(dbModel,`/send`,req.body,(err,data)=>{
						if(dberr(err,next)){
							cb(data)
						}
					})
				}
				break
				case 'approve':
				return approveDeclineOrder('approve', dbModel,member,req,res,cb)
				case 'decline':
				return approveDeclineOrder('decline', dbModel,member,req,res,cb)
				
				case 'importoutbox':
				return importOutbox(dbModel, member, req, res, next, cb)
				default:
				return error.method(req, next)
				
			}
		}else{
			return post(dbModel, member, req, res, next, cb)
		}
		
	}

	
}

function print(dbModel, member, req, res, next, cb){
	var id=req.params.param2 || req.body['id'] || req.query.id || ''
	if(id=='')
		return error.param2(req,next)

	dbModel.orders.findOne({ _id: id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				var module=doc.ioType==0?'order.outbox':'order.inbox'
				printHelper.print(dbModel,module,doc,(req.query.designId || ''),(err,renderedCode)=>{
					if(!err){
						cb(renderedCode)
					}else{
						next(err)
					}
				})
			}
		}
	})
}

function copy(dbModel, member, req, res, next, cb){
	var id=req.params.param2 || req.body['id'] || req.query.id || ''
	var newName=req.body['newName'] || req.body['name'] || ''
	if(id=='')
		return error.param2(req,next)

	dbModel.orders.findOne({ _id: id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				var data=doc.toJSON()
				data._id=undefined
				delete data._id
				if(newName.length==16){
					data.ID.value=newName
				}else{
					data.ID.value=''
				}

				var newDoc = new dbModel.orders(data)
				if(!epValidateSync(newDoc,next))
					return
				newDoc.createdDate=new Date()
				newDoc.modifiedDate=new Date()
				newDoc.orderStatus='Draft'
				newDoc.orderErrors=[]
				newDoc.localErrors=[]
				newDoc.uuid.value=uuid.v4()

				dbModel.integrators.findOne({_id:newDoc.eIntegrator},(err,eIntegratorDoc)=>{
					if(dberr(err,next)){
						if(eIntegratorDoc==null){
							return next({code: 'ENTEGRATOR', message: 'Entegrator bulanamadi.'})
						}
						documentHelper.yeniSiparisNumarasi(dbModel,eIntegratorDoc,newDoc,(err,newDoc2)=>{
							newDoc2.save((err, newDoc3)=>{
								if(dberr(err,next)){
									var obj=newDoc3.toJSON()
									obj['newName']=obj.ID.value
									cb(obj)
								} 
							})
						})
					}
				})
			}
		}
	})
}

function post(dbModel, member, req, res, next, cb){
	var data = req.body || {}
	data._id=undefined
	data=util.amountValueFixed2Digit(data,'')
	data=fazlaliklariTemizleDuzelt(data)
	var newDoc = new dbModel.orders(data)
	if(!epValidateSync(newDoc,next))
		return

	newDoc.uuid.value=uuid.v4()

	dbModel.integrators.findOne({_id:newDoc.eIntegrator},(err,eIntegratorDoc)=>{
		if(dberr(err,next)){
			if(eIntegratorDoc==null) 
				return next({code: 'ENTEGRATOR', message: 'Entegrator bulanamadi.'})
			documentHelper.yeniIrsaliyeNumarasi(dbModel,eIntegratorDoc,newDoc,(err,newDoc)=>{
				newDoc.save((err, newDoc2)=>{
					if(dberr(err,next)){

						cb(newDoc2)
					}
				})  
			})
		}
	})
}


function importOutbox(dbModel, member, req, res, next, cb){
	var data = req.body || {}
	
	if(!data.files)
		return next({code: 'WRONG_PARAMETER', message: 'files elemani bulunamadi'})

	if(!Array.isArray(data.files))
		return next({code: 'WRONG_PARAMETER', message: 'files elemani array olmak zorundadir'})

	if(data.files.length==0)
		return next({code: 'WRONG_PARAMETER', message: 'files elemani bos olamaz'})

	data.files.forEach((e)=>{
		if(e.base64Data){
			e['data']=atob(e.base64Data)
		}
	})
	

	fileImporter.run(dbModel,(data.fileImporter || ''),data,(err,results)=>{
		if(!err){
			documentHelper.findDefaultEIntegrator(dbModel,(data.eIntegrator || ''),(err,eIntegratorDoc)=>{
				if(dberr(err,next)){
					documentHelper.insertEOrder(dbModel,eIntegratorDoc,results,(err)=>{
						if(dberr(err,next))
							cb('ok')
					})
				}
			})
		}else{
			return next(err)
		}
	})
	
}

function getErrors(dbModel, member, req, res, next, cb){
	var _id= req.params.param2 || req.query._id || ''
	var select='_id profileId ID orderTypeCode localDocumentId issueDate ioType eIntegrator orderErrors localErrors orderStatus localStatus'

	if(_id=='') 
		return error.param2(req,next)
	dbModel.orders.findOne({_id:_id},select).exec((err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				var data=doc.toJSON()
				cb(data)
			}
		}
	})
}

function put(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)

	var data = req.body || {}
	data._id = req.params.param1
	data.modifiedDate = new Date()
	data=util.amountValueFixed2Digit(data,'')
	data=fazlaliklariTemizleDuzelt(data)
	dbModel.orders.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				data=util.amountValueFixed2Digit(data,'')
				var doc2 = Object.assign(doc, data)
				var newDoc = new dbModel.orders(doc2)
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

function fazlaliklariTemizleDuzelt(data){
	if((data.location || '')=='')
		data.location=undefined
	if((data.location2 || '')=='')
		data.location2=undefined
	if((data.subLocation || '')=='') 
		data.subLocation=undefined
	if((data.subLocation2 || '')=='') 
		data.subLocation2=undefined
	if((data.receiptAdvice || '')=='')
		data.receiptAdvice=undefined

	if(data.orderLine){
		data.orderLine.forEach((e)=>{
			if(e.item)
				if((e.item._id || '')=='')
					e.item._id=undefined
			})
	}

	if((data.buyerCustomerParty || '')!='' && (data.buyerCustomerParty || '')==''){
		data['buyerCustomerParty']=clone(data.buyerCustomerParty)
	}else if((data.buyerCustomerParty || '')=='' && (data.buyerCustomerParty || '')!=''){
		data['buyerCustomerParty']=clone(data.buyerCustomerParty)
	}
	if((data.sellerSupplierParty || '')!='' && (data.sellerSupplierParty || '')==''){
		data['sellerSupplierParty']=clone(data.sellerSupplierParty)
	}else if((data.sellerSupplierParty || '')=='' && (data.sellerSupplierParty || '')!=''){
		data['sellerSupplierParty']=clone(data.sellerSupplierParty)
	}
	return data
}


function getOrderList(ioType, dbModel, member, req, res, next, cb){
	var options={page: (req.query.page || 1), 
		populate:[
		{path:'eIntegrator',select:'_id eIntegrator name username'}
		],
		select:'_id ioType eIntegrator profileId ID uuid issueDate issueTime orderTypeCode lineCountNumeric orderLine localDocumentId buyerCustomerParty sellerSupplierParty orderStatus orderErrors localStatus localErrors',
		sort:{'issueDate.value':'desc' , 'ID.value':'desc'}
	}

	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit

	var filter = {ioType:ioType}

	if(req.query.eIntegrator)
		filter['eIntegrator']=req.query.eIntegrator

	if((req.query.orderNo || req.query.ID || req.query['ID.value'] || '')!=''){
		if(filter['$or']==undefined)
			filter['$or']=[]
		filter['$or'].push({'ID.value':{ '$regex': '.*' + req.query.orderNo || req.query.ID || req.query['ID.value'] + '.*' , '$options': 'i' }})
		filter['$or'].push({'localDocumentId':{ '$regex': '.*' + req.query.orderNo || req.query.ID || req.query['ID.value'] + '.*' ,'$options': 'i' }})
	}

	if(req.query.orderStatus)
		filter['orderStatus']=req.query.orderStatus
	
	if((req.query.profileId || req.query['profileId.value'] || '')!='')
		filter['profileId.value']=req.query.profileId || req.query['profileId.value']
	
	if((req.query.orderTypeCode || req.query['orderTypeCode.value'] || '')!='')
		filter['orderTypeCode.value']=req.query.orderTypeCode || req.query['orderTypeCode.value']
	

	if((req.query.date1 || '')!='')
		filter['issueDate.value']={$gte:req.query.date1}
	

	if((req.query.date2 || '')!=''){
		if(filter['issueDate.value']){
			filter['issueDate.value']['$lte']=req.query.date2
		}else{
			filter['issueDate.value']={$lte:req.query.date2}
		}
	}

	dbModel.orders.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			var liste=[]
			iteration(resp.docs,(item,cb1)=>{
				listeDuzenle(dbModel,item,(err,obj)=>{
					liste.push(obj)
					cb1(null)
				})
				
			},0,true,(err)=>{
				
				resp.docs=liste
				cb(resp)
			})
		}
	})
}

function listeDuzenle(dbModel,e,cb){
	var obj={}
	obj['_id']=e['_id']
	obj['eIntegrator']=e['eIntegrator']
	obj['ioType']=e['ioType']
	obj['profileId']=e['profileId'].value
	obj['ID']=e.ID.value
	obj['uuid']=e['uuid'].value
	obj['issueDate']=e['issueDate'].value
	obj['issueTime']=e['issueTime'].value
	obj['orderTypeCode']=e['orderTypeCode'].value

	obj['party']={title:'',vknTckn:''}
	if(e.ioType==0){
		obj['party']['title']=e.buyerCustomerParty.party.partyName.name.value || (e.buyerCustomerParty.party.person.firstName.value + ' ' + e.buyerCustomerParty.party.person.familyName.value)
		e.buyerCustomerParty.party.partyIdentification.forEach((e2)=>{
			var schemeID=''
			if(e2.ID.attr!=undefined){
				schemeID=(e2.ID.attr.schemeID || '').toLowerCase()
			}
			if(schemeID.indexOf('vkn')>-1 || schemeID.indexOf('tckn')>-1){
				obj['party']['vknTckn']=e2.ID.value || ''
				return
			}
		})
	}else{
		obj['party']['title']=e.sellerSupplierParty.party.partyName.name.value || (e.sellerSupplierParty.party.person.firstName.value + ' ' + e.sellerSupplierParty.party.person.familyName.value)
		e.sellerSupplierParty.party.partyIdentification.forEach((e2)=>{
			var schemeID=''
			if(e2.ID.attr!=undefined){
				schemeID=(e2.ID.attr.schemeID || '').toLowerCase()
			}

			if(schemeID.indexOf('vkn')>-1 || schemeID.indexOf('tckn')>-1){
				obj['party']['vknTckn']=e2.ID.value || ''
				return
			}

		})
	}

	obj['lineCountNumeric']=e['lineCountNumeric'].value
	obj['localDocumentId']=e['localDocumentId']
	obj['orderStatus']=e['orderStatus']
	obj['orderErrors']=e['orderErrors']
	obj['localStatus']=e['localStatus']
	obj['localErrors']=e['localErrors']
	cb(null,obj)

}

function getOrder(dbModel, member, req, res, next, cb){
	var _id= req.params.param1 || req.query._id || ''
	var includeAdditionalDocumentReference= req.query.includeAdditionalDocumentReference || false
	var select='-additionalDocumentReference'
	if(includeAdditionalDocumentReference==true)
		select=''

	if(_id=='')
		return error.param1(req, next)

	dbModel.orders.findOne({_id:_id}).select(select).exec((err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				if(!req.query.print){
					var data=doc.toJSON()
					cb(data)
				}else{
					yazdir(dbModel,'order',req,res,doc,(err,html)=>{
						if(dberr(err,next))
							cb({file: {data:html}})
					})
				}
			}
		}
	})
}

function yazdir(dbModel,moduleName,req,res,doc,cb){
	var designId=req.query.designId || ''
	if((doc.eIntegrator || '')=='')
		return printHelper.print(dbModel,'order',doc, designId, cb)
	doc.populate('eIntegrator').execPopulate((err,doc2)=>{
		if(dberr(err,next)){
			if(doc2.eIntegrator.order.url=='')
				return printHelper.print(dbModel,'order',doc, designId, cb)
			dbModel.services.eOrder.xsltView(doc2,(err,html)=>{
				if(dberr(err,next)){
					cb(html)
				}
			})
		}
	})
}

function deleteItem(dbModel, member, req, res, next, cb){
	console.log('order.deleteItem calisti')
	if(req.params.param1==undefined)
		return error.param1(req, next)
	
	var data = req.body || {}
	data._id = req.params.param1

	dbModel.orders.findOne({_id:data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				if(!(doc.orderStatus=='Draft' || doc.orderStatus=='Error' || doc.orderStatus=='Canceled' || doc.orderStatus=='Declined')){
					return next({code:'PERMISSION_DENIED',message:`Belgenin durumundan dolayi silinemez!`})
				}else{
					dbModel.orders.removeOne(member,{ _id: data._id},(err,doc)=>{
						if(dberr(err,next)){
							cb(null)
						}
					})
				}
			}
		}
	})
}


function autoCreateCariKart(dbModel, doc, cb){
	if(dbModel.settings.order_inbox_auto_create_vendor && doc.ioType==1){
		autoCreateVendor(dbModel,doc,cb)
	}else if(dbModel.settings.order_outbox_auto_create_customer && doc.ioType==0){
		autoCreateCustomer(dbModel,doc,cb)
	}else{
		if(cb)
			cb(null)
	}
}

function autoCreateVendor(dbModel, doc, cb){
	
	var newDoc = new dbModel.parties(data)
	if(!epValidateSync(newDoc,next))
		return

}


function autoCreateCustomer(dbModel, doc, cb){

}
