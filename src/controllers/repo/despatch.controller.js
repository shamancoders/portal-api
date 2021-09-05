module.exports = (dbModel, member, req, res, next, cb)=>{
	
	switch(req.method){
		case 'GET':
		return get()
		break
		case 'POST':
		
			return postData()
		
		
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
			if(req.params.param2!=undefined){
				return getDespatch(dbModel, member, req, res, next, cb)
			}else{
				return getDespatchList(1, dbModel, member, req, res, next, cb)
			}
			
			break
			case 'outbox':
			if(req.params.param2!=undefined){
				return getDespatch(dbModel, member, req, res, next, cb)
			}else{
				return getDespatchList(0, dbModel, member, req, res, next, cb)
			}
			break
			case 'print':
			return print(dbModel, member, req, res, next, cb)
			break
			case 'errors':
			case 'logs':
			restServices.eDespatch.get(dbModel,`/${req.params.param1}/${req.params.param2}`,{},(err,data)=>{
				if(dberr(err,next)){
					cb(data)
				}
			})
			break
			case 'view':
			case 'xslt':
			case 'xml':
			restServices.eDespatch.getFile(dbModel,`/${req.params.param1}/${req.params.param2}`,{},(err,data)=>{
				if(dberr(err,next)){
					cb({file:{fileName:req.params.param2,data:data}})
				}
			})
			break
			
			case 'edespatchuserlist':
			return getEDespatchUserList(dbModel, member, req, res, next, cb)
			case 'errors':
			return getErrors(dbModel, member, req, res, next, cb)

			default:
			return getDespatch(dbModel, member, req, res, next, cb)
		}
	}

	function postData(){
		if(req.params.param1!=undefined){
			switch(req.params.param1.lcaseeng()){
				case 'send':
				if(req.params.param2!=undefined){
					restServices.eDespatch.post(dbModel,`/send/${req.params.param2}`,req.body,(err,data)=>{
						if(dberr(err,next)){
							cb(data)
						}
					})
				}else{
					restServices.eDespatch.post(dbModel,`/send`,req.body,(err,data)=>{
						if(dberr(err,next)){
							cb(data)
						}
					})
				}
				break
				case 'approve':
				return approveDeclineDespatch('approve', dbModel,member,req,res,cb)
				case 'decline':
				return approveDeclineDespatch('decline', dbModel,member,req,res,cb)
				
				case 'importoutbox':
				return importOutbox(dbModel, member, req, res, next, cb)
				case 'copy':
				return copy(dbModel, member, req, res, next, cb)

				case 'inbox':
				req.body.ioType=1
				return post(dbModel, member, req, res, next, cb)
				case 'outbox':
				req.body.ioType=0
				return post(dbModel, member, req, res, next, cb)
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
	dbModel.despatches.findOne({ _id: id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				if(doc.ioType==0){
					var module=doc.ioType==0?'despatch.outbox':'despatch.inbox'
						printHelper.print(dbModel,module,doc,(req.query.designId || ''),(err,renderedCode)=>{
							if(!err){
								cb(renderedCode)
							}else{
								next(err)
							}
						})
				}else{
					restServices.eDespatch.getFile(dbModel,`/view/${id}`,{},(err,data)=>{
						
						if(dberr(err,next)){
							cb({file:{fileName:id,data:data}})
						}
					})
				}
			}
		}
	})
}

function copy(dbModel, member, req, res, next, cb){
	var id=req.params.param2|| req.body['id'] || req.query.id || ''
	var newName=req.body['newName'] || req.body['name'] || ''
	if(id=='')
		return error.param2(req,next)

	dbModel.despatches.findOne({ _id: id},(err,doc)=>{
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

				var newDoc = new dbModel.despatches(data)
				if(!epValidateSync(newDoc,next))
					return
				newDoc.createdDate=new Date()
				newDoc.modifiedDate=new Date()
				newDoc.despatchStatus='Draft'
				
				newDoc.despatchErrors=[]
				newDoc.localStatus=''
				newDoc.localErrors=[]
				newDoc.uuid.value=uuid.v4()
				dbModel.integrators.findOne({_id:newDoc.eIntegrator},(err,eIntegratorDoc)=>{
					if(dberr(err,next)){
						if(eIntegratorDoc==null){
							return next({code: 'ENTEGRATOR', message: 'Entegrator bulanamadi.'})
						}
						documentHelper.yeniIrsaliyeNumarasi(dbModel,eIntegratorDoc,newDoc,(err,newDoc2)=>{
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
	var newDoc = new dbModel.despatches(data)
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
					documentHelper.insertEDespatch(dbModel,eIntegratorDoc,results,(err)=>{
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
	var select='_id profileId ID despatchTypeCode localDocumentId issueDate ioType eIntegrator despatchErrors localErrors despatchStatus localStatus'

	if(_id=='') 
		return error.param2(req,next)
	dbModel.despatches.findOne({_id:_id},select).exec((err,doc)=>{
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
	if((req.params.param1=='inbox' || req.params.param1=='outbox') && req.params.param2!=undefined){
		data._id = req.params.param2
	}else{
		data._id = req.params.param1
	}
	
	data.modifiedDate = new Date()
	data=util.amountValueFixed2Digit(data,'')
	data=fazlaliklariTemizleDuzelt(data)

	dbModel.despatches.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				data=util.amountValueFixed2Digit(data,'')
				var doc2 = Object.assign(doc, data)
				
				var newDoc = new dbModel.despatches(doc2)
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

	if(data.despatchLine){
		data.despatchLine.forEach((e)=>{
			if(e.item)
				if((e.item._id || '')=='')
					e.item._id=undefined
			})
	}

	if((data.deliveryCustomerParty || '')!='' && (data.buyerCustomerParty || '')==''){
		data['buyerCustomerParty']=clone(data.deliveryCustomerParty)
	}else if((data.deliveryCustomerParty || '')=='' && (data.buyerCustomerParty || '')!=''){
		data['deliveryCustomerParty']=clone(data.buyerCustomerParty)
	}
	if((data.despatchSupplierParty || '')!='' && (data.sellerSupplierParty || '')==''){
		data['sellerSupplierParty']=clone(data.despatchSupplierParty)
	}else if((data.despatchSupplierParty || '')=='' && (data.sellerSupplierParty || '')!=''){
		data['despatchSupplierParty']=clone(data.sellerSupplierParty)
	}

	if((data.deliveryCustomerParty || '')!=''){
		if((data.deliveryCustomerParty.party || '')!=''){
			if((data.deliveryCustomerParty.party._id || '')=='')
				data.deliveryCustomerParty.party._id=null
		}
	}

	if((data.buyerCustomerParty || '')!=''){
		if((data.buyerCustomerParty.party || '')!=''){
			if((data.buyerCustomerParty.party._id || '')=='')
				data.buyerCustomerParty.party._id=null
		}
	}

	if((data.despatchSupplierParty || '')!=''){
		if((data.despatchSupplierParty.party || '')!=''){
			if((data.despatchSupplierParty.party._id || '')=='')
				data.despatchSupplierParty.party._id=null
		}
	}

	if((data.sellerSupplierParty || '')!=''){
		if((data.sellerSupplierParty.party || '')!=''){
			if((data.sellerSupplierParty.party._id || '')=='')
				data.sellerSupplierParty.party._id=null
		}
	}

	if(data.issueTime.value.length<8){
		if(data.issueTime.value.length==5){
			data.issueTime.value+=':00'
		}
	}

	data.lineCountNumeric={value:0}
	if(data.despatchLine){
		data.lineCountNumeric.value=data.despatchLine.length
	}
	return data
}

function getDespatchList(ioType, dbModel, member, req, res, next, cb){
	var options={page: (req.query.page || 1), 
		populate:[
		{path:'eIntegrator',select:'_id eIntegrator name username' }
		],
		
		select:'_id ioType eIntegrator profileId ID uuid issueDate issueTime despatchAdviceTypeCode lineCountNumeric despatchLine localDocumentId deliveryCustomerParty despatchSupplierParty receiptAdvice despatchStatus despatchErrors localStatus localErrors',
		sort:{'issueDate.value':'desc' , 'ID.value':'desc'}
	}

	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit

	// var filter = {}
	var filter = {ioType:ioType}

	if(req.query.eIntegrator)
		filter['eIntegrator']=req.query.eIntegrator

	if((req.query.despatchNo || req.query.ID || req.query['ID.value'] || '')!=''){
		if(filter['$or']==undefined)
			filter['$or']=[]
		filter['$or'].push({'ID.value':{ '$regex': '.*' + req.query.despatchNo || req.query.ID || req.query['ID.value'] + '.*' , '$options': 'i' }})
		filter['$or'].push({'localDocumentId':{ '$regex': '.*' + req.query.despatchNo || req.query.ID || req.query['ID.value'] + '.*' ,'$options': 'i' }})
	}

	if(req.query.despatchStatus)
		filter['despatchStatus']=req.query.despatchStatus
	
	if((req.query.profileId || req.query['profileId.value'] || '')!='')
		filter['profileId.value']=req.query.profileId || req.query['profileId.value']
	
	if((req.query.despatchAdviceTypeCode || req.query['despatchAdviceTypeCode.value'] || '')!='')
		filter['despatchAdviceTypeCode.value']=req.query.despatchAdviceTypeCode || req.query['despatchAdviceTypeCode.value']
	

	if((req.query.date1 || '')!='')
		filter['issueDate.value']={$gte:req.query.date1}
	

	if((req.query.date2 || '')!=''){
		if(filter['issueDate.value']){
			filter['issueDate.value']['$lte']=req.query.date2
		}else{
			filter['issueDate.value']={$lte:req.query.date2}
		}
	}

	// var b=dbModel.integrators
	// //dbModel.conn.models['integrators']=dbModel.integrators
	// var a=dbModel.despatches
	// Object.keys(dbModel.conn.models).forEach((key)=>{
	// 	console.log(`despatch controller:`,key)
	// })
	dbModel.despatches.paginate(filter,options,(err, resp)=>{
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
	obj['despatchAdviceTypeCode']=e['despatchAdviceTypeCode'].value

	obj['party']={title:'',vknTckn:''}
	if(e.ioType==0){
		obj['party']['title']=e.deliveryCustomerParty.party.partyName.name.value || (e.deliveryCustomerParty.party.person.firstName.value + ' ' + e.deliveryCustomerParty.party.person.familyName.value)
		e.deliveryCustomerParty.party.partyIdentification.forEach((e2)=>{
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
		obj['party']['title']=e.despatchSupplierParty.party.partyName.name.value || (e.despatchSupplierParty.party.person.firstName.value + ' ' + e.despatchSupplierParty.party.person.familyName.value)
		e.despatchSupplierParty.party.partyIdentification.forEach((e2)=>{
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
	obj['despatchStatus']=e['despatchStatus']
	obj['despatchErrors']=e['despatchErrors']
	obj['localStatus']=e['localStatus']
	obj['localErrors']=e['localErrors']
	obj['totalDeliveredQuantity']=0
	e.despatchLine.forEach((e2)=>{
		obj.totalDeliveredQuantity+=Number(e2.deliveredQuantity.value)
	})
	obj['receiptAdvice']={
		_id:'',
		profileId:'',
		ID:'',
		uuid:'',
		issueDate:'',
		issueTime:'',
		receiptAdviceTypeCode:'',
		receiptStatus:'OnTheWay',
		deliveryContactName:'',
		despatchContactName:'',
		actualDeliveryDate:'',
		actualDeliveryTime:'',
		totalReceivedQuantity:0,
		totalRejectedQuantity:0
	}
	if((e.receiptAdvice || '')!=''){
		dbModel.despatches_receipt_advice.findOne({_id:e.receiptAdvice},(err,receiptAdviceDoc)=>{
			if(!err){
				if(receiptAdviceDoc){
					obj.receiptAdvice._id=receiptAdviceDoc._id
					obj.receiptAdvice.profileId=receiptAdviceDoc.profileId.value
					obj.receiptAdvice.ID=receiptAdviceDoc.ID.value
					obj.receiptAdvice.uuid=receiptAdviceDoc.uuid.value
					obj.receiptAdvice.issueDate=receiptAdviceDoc.issueDate.value
					obj.receiptAdvice.issueTime=receiptAdviceDoc.issueTime.value
					obj.receiptAdvice.receiptAdviceTypeCode=receiptAdviceDoc.receiptAdviceTypeCode.value
					obj.receiptAdvice.receiptStatus=receiptAdviceDoc.receiptStatus
					obj.receiptAdvice.despatchContactName=receiptAdviceDoc.despatchSupplierParty.despatchContact.name.value
					obj.receiptAdvice.deliveryContactName=receiptAdviceDoc.deliveryCustomerParty.deliveryContact.name.value
					obj.receiptAdvice.actualDeliveryDate=receiptAdviceDoc.shipment.delivery.actualDeliveryDate.value
					obj.receiptAdvice.actualDeliveryTime=receiptAdviceDoc.shipment.delivery.actualDeliveryTime.value
					
					receiptAdviceDoc.receiptLine.forEach((line)=>{
						obj.receiptAdvice.totalReceivedQuantity += Number(line.receivedQuantity.value)
						obj.receiptAdvice.totalRejectedQuantity += Number(line.rejectedQuantity.value)
					})
				}
			}
			
			return cb(null,obj)
		})
	}else{
		return cb(null,obj)
	}

}

function getDespatch(dbModel, member, req, res, next, cb){
	var _id=''
	if(req.params.param1=='inbox' && req.params.param2!=undefined){
	 _id=req.params.param2 || req.query._id || ''
	}else if(req.params.param1=='outbox' && req.params.param2!=undefined){
		_id=req.params.param2 || req.query._id || ''
	}else{
		_id=req.params.param1 || req.query._id || ''
	}
	var includeAdditionalDocumentReference= req.query.includeAdditionalDocumentReference || false
	var select='-additionalDocumentReference'
	if(includeAdditionalDocumentReference==true)
		select=''

	if(_id=='')
		return error.param1(req, next)

	dbModel.despatches.findOne({_id:_id}).select(select).exec((err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				if(!req.query.print){
					var data=doc.toJSON()
					cb(data)
				}else{
					yazdir(dbModel,'despatch',req,res,doc,(err,html)=>{
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
		return printHelper.print(dbModel,'despatch',doc, designId, cb)
	doc.populate('eIntegrator').execPopulate((err,doc2)=>{
		if(dberr(err,next)){
			if(doc2.eIntegrator.despatch.url=='')
				return printHelper.print(dbModel,'despatch',doc, designId, cb)
			dbModel.services.eDespatch.xsltView(doc2,(err,html)=>{
				if(dberr(err,next)){
					cb(html)
				}
			})
		}
	})
}

function getEDespatchUserList(dbModel, member, req, res, next, cb){
	var options={page: (req.query.page || 1), 
		limit:10
	}

	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit

	var filter = {}

	var vkn=req.query.vkn || req.query.tckn || req.query.vknTckn || req.query.taxNumber || req.query.identifier || ''

	if(vkn!='')
		filter['identifier']={ '$regex': '.*' + vkn + '.*' ,'$options': 'i' }
	
	if((req.query.title || '')!='')
		filter['title']={ '$regex': '.*' + req.query.title + '.*' ,'$options': 'i' }
	
	if(req.query.enabled)
		filter['enabled']=Boolean(req.query.enabled)
	
	if((req.query.postboxAlias || '')!='')
		filter['postboxAlias']={ $regex: '.*' + req.query.postboxAlias + '.*' ,$options: 'i' }


	db.einvoice_users.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		} 
	})
}

function deleteItem(dbModel, member, req, res, next, cb){
	
	if(req.params.param1==undefined)
		return error.param1(req, next)
	
	var data = req.body || {}
	data._id = req.params.param1

	dbModel.despatches.findOne({_id:data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				if(!(doc.despatchStatus=='Draft' || doc.despatchStatus=='Error' || doc.despatchStatus=='Canceled' || doc.despatchStatus=='Declined')){
					return next({code:'PERMISSION_DENIED',message:`Belgenin durumundan dolayi silinemez!`})
				}else{
					dbModel.despatches.removeOne(member,{ _id: data._id},(err,doc)=>{
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
	if(dbModel.settings.despatch_inbox_auto_create_vendor && doc.ioType==1){
		autoCreateVendor(dbModel,doc,cb)
	}else if(dbModel.settings.despatch_outbox_auto_create_customer && doc.ioType==0){
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
