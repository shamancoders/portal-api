module.exports = (dbModel, member, req, res, next, cb)=>{
	if(req.params.param1==undefined)
		return error.param1(req, next)

	switch(req.method){
		case 'GET':
		switch(req.params.param1.lcaseeng()){

			case 'inboxinvoicelist':
			return getInvoiceList(1, dbModel, member, req, res, next, cb)
			break
			case 'outboxinvoicelist':
			return getInvoiceList(0, dbModel, member, req, res, next, cb)
			break
			case 'invoice':
			return getInvoice(dbModel, member, req, res, next, cb)
			break
			case 'invoiceview':
			return invoiceView(dbModel, member, req, res, next, cb)
			break
			case 'invoicepdf':
			return invoicePdf(dbModel, member, req, res, next, cb)
			break
			case 'invoicexmlxslt':
			case 'invoicexml':
			case 'invoicexslt':
			case 'invoicexsltxml':
			return getInvoiceXmlXslt(dbModel, member, req, res, next, cb)
			break
			case 'einvoiceuserlist':
			return getEInvoiceUserList(dbModel, member, req, res, next, cb)
			case 'errors':
			return getErrors(dbModel, member, req, res, next, cb)

			default:
			return error.method(req, next)
			break
		}
		break
		case 'POST':
		switch(req.params.param1.lcaseeng()){
			case 'transfer':
			if(req.params.param2.lcaseeng()=='import'){
				transferImport(dbModel, member, req, res, next, cb)
			}else if(req.params.param2.lcaseeng()=='export'){
				return error.method(req, next)
			}else{
				return error.method(req, next)
			}
			break
			case 'sendtogib':
			return sendToGib(dbModel, member, req, res, next, cb)
			case 'approve':
			return approveDeclineInvoice('approve', dbModel,member,req,res,cb)
			case 'decline':
			return approveDeclineInvoice('decline', dbModel,member,req,res,cb)
			case 'saveinboxinvoice':
			case 'saveoutboxinvoice':
			case 'invoice':
			return post(dbModel, member, req, res, next, cb)
			case 'importoutboxinvoice':
			return importOutboxInvoice(dbModel, member, req, res, next, cb)
			default:
			return error.method(req, next)
			break
		}

		break
		case 'PUT':
		switch(req.params.param1.lcaseeng()){
			case 'saveinboxinvoice':
			case 'saveoutboxinvoice':
			case 'invoice':
			return put(dbModel, member, req, res, next, cb)

			default:
			return error.method(req, next)
			break
		}
		break
		default:
		return error.method(req, next)
		break
	}
}

function getErrors(dbModel, member, req, res, next, cb){
	var _id= req.params.param2 || req.query._id || ''
	var select='_id profileId ID invoiceTypeCode localDocumentId issueDate ioType eIntegrator invoiceErrors localErrors invoiceStatus localStatus'
	
	if(_id=='')
		return error.param2(req,next)
	dbModel.invoices.findOne({_id:_id}).select(select).exec((err,doc)=>{
		if(dberr(err,next))
			if(dbnull(doc,next)){
				var data=doc.toJSON()
				cb(data)
			}
		})
}

function post(dbModel, member, req, res, next, cb){
	var data = req.body || {}
	data._id=undefined
	
	data=util.amountValueFixed2Digit(data,'')
	var newDoc = new dbModel.invoices(data)
	if(!epValidateSync(newDoc,next))
		return
	newDoc.uuid.value=uuid.v4()
	newDoc=calculateInvoiceTotals(newDoc)

	dbModel.integrators.findOne({_id:newDoc.eIntegrator},(err,eIntegratorDoc)=>{
		if(dberr(err,next)){
			if(eIntegratorDoc==null)
				return next({code: 'ENTEGRATOR', message: 'Faturada entegrator bulanamadi.'})
			documentHelper.yeniFaturaNumarasi(dbModel,eIntegratorDoc,newDoc,(err,newDoc)=>{
				newDoc.save((err, newDoc2)=>{
					if(dberr(err,next)){
						cb(newDoc2)
					}
				})  
			})
		}
	})
}

function importOutboxInvoice(dbModel, member, req, res, next, cb){
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
				if(!err){
					documentHelper.insertEInvoice(dbModel,eIntegratorDoc,results,(err)=>{
						if(!err){
							cb('ok')
						}else{
							return next(err)
						}
					})
				}else{
					return next(err)
				}
			})

		}else{

		}
	})

}

function put(dbModel, member, req, res, next, cb){
	if(req.params.param2==undefined)
		return error.param2(req,next)
	var data = req.body || {}
	data._id = req.params.param2
	data.modifiedDate = new Date()

	dbModel.invoices.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				data=util.amountValueFixed2Digit(data,'')
				var doc2 = Object.assign(doc, data)
				var newDoc = new dbModel.invoices(doc2)
				if(!epValidateSync(newDoc,next))
					return
				newDoc=calculateInvoiceTotals(newDoc)
				newDoc.save((err, newDoc2)=>{
					if(dberr(err,next)){
						cb(newDoc2)
					}
				})

			}
		}
	})
}

function calculateInvoiceTotals(invoice){
	var bSatirdaVergiVar=false
	if(invoice.invoiceLine!=undefined){
		if(invoice.invoiceLine.length>0){
			invoice.invoiceLine.forEach((line)=>{
				if(line.taxTotal!=undefined){
					if(line.taxTotal.taxAmount.value>0){
						bSatirdaVergiVar=true
						return
					}
				}
			})
		}
		invoice.lineCountNumeric.value=invoice.invoiceLine.length
	}
	if(bSatirdaVergiVar){
		invoice.taxTotal=[]
		invoice.withholdingTaxTotal=[]
		invoice.invoiceLine.forEach((line)=>{
			if(line.taxTotal!=undefined){
				if(line.taxTotal.taxAmount.value>0 && line.taxTotal.taxSubtotal.length>0){
					var bAyniVergiTuruBulundu=false
					invoice.taxTotal.forEach(function(e){
						if(e.taxSubtotal.length>0)
							if(e.taxSubtotal[0].percent==line.taxTotal.taxSubtotal[0].percent && e.taxSubtotal[0].taxCategory.taxScheme.taxTypeCode.value==line.taxTotal.taxSubtotal[0].taxCategory.taxScheme.taxTypeCode.value){
								e.taxAmount.value +=line.taxTotal.taxAmount.value
								e.taxSubtotal[0].taxableAmount.value += line.taxTotal.taxSubtotal[0].taxableAmount.value
								e.taxSubtotal[0].taxAmount.value += line.taxTotal.taxSubtotal[0].taxAmount.value
								bAyniVergiTuruBulundu=true
								return
							}
						})
					if(bAyniVergiTuruBulundu==false){
						invoice.taxTotal.push(JSON.parse(JSON.stringify(line.taxTotal)))
					}
				}
				if(line.withholdingTaxTotal!=undefined){
					if(line.withholdingTaxTotal.length>0){
						if(line.withholdingTaxTotal[0].taxAmount.value>0 && line.withholdingTaxTotal[0].taxSubtotal.length>0){
							var bAyniVergiTuruBulundu=false
							invoice.withholdingTaxTotal.forEach(function(e){
								if(e.taxSubtotal.length>0)
									if(e.taxSubtotal[0].percent==line.withholdingTaxTotal[0].taxSubtotal[0].percent && e.taxSubtotal[0].taxCategory.taxScheme.taxTypeCode.value==line.withholdingTaxTotal[0].taxSubtotal[0].taxCategory.taxScheme.taxTypeCode.value){
										e.taxAmount.value +=line.withholdingTaxTotal[0].taxAmount.value
										e.taxSubtotal[0].taxableAmount.value += line.withholdingTaxTotal[0].taxSubtotal[0].taxableAmount.value
										e.taxSubtotal[0].taxAmount.value += line.withholdingTaxTotal[0].taxSubtotal[0].taxAmount.value
										bAyniVergiTuruBulundu=true
										return
									}
								})
							if(bAyniVergiTuruBulundu==false){
								invoice.withholdingTaxTotal.push(JSON.parse(JSON.stringify(line.withholdingTaxTotal[0])))
							}
						}
					}
				}
			}
		})
	}

	var vergiToplam=0
	invoice.taxTotal.forEach((e)=>{
		vergiToplam +=e.taxAmount.value
	})
	var tevkifatToplam=0
	invoice.withholdingTaxTotal.forEach((e)=>{
		tevkifatToplam +=e.taxAmount.value
	})

	var toplamIndirim=0
	var toplamMasraf=0
	invoice.allowanceCharge.forEach((e)=>{
		if(e.chargeIndicator.value){
			toplamMasraf +=e.amount.value
		}else{
			toplamIndirim +=e.amount.value
		}
	})

	invoice.legalMonetaryTotal={
		lineExtensionAmount:{value:0},
		allowanceTotalAmount:{value:toplamIndirim},
		chargeTotalAmount:{value:toplamMasraf},
		taxExclusiveAmount:{value:0},
		taxInclusiveAmount:{value:0},
		payableRoundingAmount:{value:0},
		payableAmount:{value:0},
	}


	if(invoice.invoiceLine!=undefined){
		invoice.invoiceLine.forEach((line)=>{
			invoice.legalMonetaryTotal.lineExtensionAmount.value += line.lineExtensionAmount.value
		})
	}
	invoice.legalMonetaryTotal.taxExclusiveAmount.value=invoice.legalMonetaryTotal.lineExtensionAmount.value - toplamIndirim + toplamMasraf
	invoice.legalMonetaryTotal.taxInclusiveAmount.value=invoice.legalMonetaryTotal.taxExclusiveAmount.value + vergiToplam - tevkifatToplam
	invoice.legalMonetaryTotal.payableRoundingAmount.value=invoice.legalMonetaryTotal.taxInclusiveAmount.value
	invoice.legalMonetaryTotal.payableAmount.value=invoice.legalMonetaryTotal.taxInclusiveAmount.value
	return invoice
}

function transferImport(dbModel, member, req, res, next, cb){

	dbModel.integrators.find({passive:false,'localConnectorImportInvoice.localConnector':{$ne:null}}).populate(['localConnectorImportInvoice.localConnector']).exec((err,docs)=>{
		if (dberr(err,next)){
			if(docs.length==0)
				return next({code:'NOT_DEFINED',message:'Local connectoru tanimlanmis aktif bir entegrator bulunmamaktadir.'})

			var index=0
			var kuyrugaAlinan=0
			var zatenKuyrukta=0


			function pushTask(cb){
				if(index>=docs.length){
					cb(null)
				}else{
					dbModel.tasks.findOne({taskType:'connector_import_einvoice',collectionName:'integrators',documentId:docs[index]._id, status:{$in:['running','pending']}},(err,doc)=>{
						if(dberr(err,next)){
							if(doc==null){
								var taskdata={taskType:'connector_import_einvoice',collectionName:'integrators',documentId:docs[index]._id,document:docs[index]}
								taskHelper.newTask(dbModel,taskdata,(err,taskDoc)=>{
									if(!err){
										switch(taskDoc.status){
											case 'running':
											docs[index].localConnectorImportInvoice['status']='transferring'
											break
											case 'pending':
											docs[index].localConnectorImportInvoice['status']='pending'
											break
											case 'completed':
											docs[index].localConnectorImportInvoice['status']='transferred'
											break
											case 'error':
											docs[index].localConnectorImportInvoice['status']='error'
											break
											default:
											docs[index].localConnectorImportInvoice['status']=''
											break
										}
										docs[index].save((err,newDoc)=>{
											if(!err){
												kuyrugaAlinan++
												index++
												setTimeout(pushTask,0,cb)
											}else{
												cb(err)
												// index++
												// setTimeout(pushTask,0,cb)
											}
										})
									}else{
										cb(err)
										// index++
										// setTimeout(pushTask,0,cb)
									}
								})
							}else{
								zatenKuyrukta++
								index++
								setTimeout(pushTask,0,cb)
							}
						}
					})

				}
			}
			pushTask((err)=>{
				if(dberr(err,next)){
					if(kuyrugaAlinan==0 && zatenKuyrukta>0){
						return next({code:'ALREADY_IN_PROCESSING',message:'Islem gorev yoneticisine alinmis. Birazdan tamamlanir.'})
					}else{
						cb('Gorev yoneticisine ' + kuyrugaAlinan.toString() + ' adet gorev alindi')
					}
				}
			})
		}
	})
}

function getInvoiceList(ioType, dbModel, member, req, res, next, cb){
	var options={page: (req.query.page || 1), 
		populate:[
		{path:'eIntegrator',select:'_id eIntegrator name username'}
		],
		limit:10
		,
		select:'_id eIntegrator profileId ID uuid issueDate issueTime invoiceTypeCode documentCurrencyCode lineCountNumeric localDocumentId pricingExchangeRate accountingCustomerParty accountingSupplierParty legalMonetaryTotal taxTotal withholdingTaxTotal invoiceStatus invoiceErrors localStatus localErrors',
		sort:{'issueDate.value':'desc' , 'ID.value':'desc'}
	}

	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit


	var filter = {ioType:ioType}
	
	if(req.query.eIntegrator){
		filter['eIntegrator']=req.query.eIntegrator
	}
	if((req.query.ID || req.query['ID.value'] || '')!=''){
		filter['ID.value']={ $regex: '.*' + req.query.ID || req.query['ID.value'] + '.*' ,$options: 'i' }
	}
	if((req.query.invoiceNo || '')!=''){
		if(filter['$or']==undefined)
			filter['$or']=[]
		filter['$or'].push({'ID.value':{ '$regex': '.*' + req.query.invoiceNo + '.*' , '$options': 'i' }})
		filter['$or'].push({'localDocumentId':{ '$regex': '.*' + req.query.invoiceNo + '.*' ,'$options': 'i' }})
	}
	if(req.query.invoiceStatus)
		filter['invoiceStatus']=req.query.invoiceStatus

	if((req.query.profileId || req.query['profileId.value'] || '')!='')
		filter['profileId.value']=req.query.profileId || req.query['profileId.value']
	
	if((req.query.invoiceTypeCode || req.query['invoiceTypeCode.value'] || '')!='')
		filter['invoiceTypeCode.value']=req.query.invoiceTypeCode || req.query['invoiceTypeCode.value']

	if((req.query.documentCurrencyCode || req.query['documentCurrencyCode.value'] || '')!='')
		filter['documentCurrencyCode.value']=req.query.documentCurrencyCode || req.query['documentCurrencyCode.value']

	if((req.query.date1 || '')!='')
		filter['issueDate.value']={$gte:req.query.date1}

	if((req.query.date2 || '')!=''){
		if(filter['issueDate.value']){
			filter['issueDate.value']['$lte']=req.query.date2
		}else{
			filter['issueDate.value']={$lte:req.query.date2}
		}
	}
	
	dbModel.invoices.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			var liste=[]
			resp.docs.forEach((e,index)=>{

				var obj={}
				obj['_id']=e['_id']
				obj['eIntegrator']=e['eIntegrator']
				obj['ioType']=e['ioType']
				obj['profileId']=e['profileId'].value
				obj['ID']=e.ID.value
				obj['uuid']=e['uuid'].value
				obj['issueDate']=e['issueDate'].value
				obj['issueTime']=e['issueTime'].value
				obj['invoiceTypeCode']=e['invoiceTypeCode'].value
				
				obj['accountingParty']={title:'',vknTckn:''}
				if(ioType==0){
					obj['accountingParty']['title']=e.accountingCustomerParty.party.partyName.name.value || (e.accountingCustomerParty.party.person.firstName.value + ' ' + e.accountingCustomerParty.party.person.familyName.value)
					e.accountingCustomerParty.party.partyIdentification.forEach((e2)=>{
						var schemeID=''
						if(e2.ID.attr!=undefined){
							schemeID=(e2.ID.attr.schemeID || '').toLowerCase()
						}
						if(schemeID.indexOf('vkn')>-1 || schemeID.indexOf('tckn')>-1){
							obj['accountingParty']['vknTckn']=e2.ID.value || ''
							return
						}
					})
				}else{
					obj['accountingParty']['title']=e.accountingSupplierParty.party.partyName.name.value || (e.accountingSupplierParty.party.person.firstName.value + ' ' + e.accountingSupplierParty.party.person.familyName.value)
					e.accountingSupplierParty.party.partyIdentification.forEach((e2)=>{
						var schemeID=''
						if(e2.ID.attr!=undefined){
							schemeID=(e2.ID.attr.schemeID || '').toLowerCase()
						}
						
						if(schemeID.indexOf('vkn')>-1 || schemeID.indexOf('tckn')>-1){
							obj['accountingParty']['vknTckn']=e2.ID.value || ''
							return
						}

					})
				}
				obj['payableAmount']=e['legalMonetaryTotal'].payableAmount.value
				obj['taxExclusiveAmount']=e['legalMonetaryTotal'].taxExclusiveAmount.value
				obj['taxSummary']={
					vat1:0,vat8:0,vat18:0,
					vat0TaxableAmount:0,
					vat1TaxableAmount:0,
					vat8TaxableAmount:0,
					vat18TaxableAmount:0
				}
				var taxTotal=0,withholdingTaxTotal=0
				e['taxTotal'].forEach((e2)=>{
					taxTotal=taxTotal + e2.taxAmount.value
					e2.taxSubtotal.forEach((e3)=>{
						switch(e3.percent.value){
							case 1:
							obj['taxSummary'].vat1+=e3.taxAmount.value
							obj['taxSummary'].vat1TaxableAmount+=e3.taxableAmount.value
							break
							case 8:
							obj['taxSummary'].vat8+=e3.taxAmount.value
							obj['taxSummary'].vat8TaxableAmount+=e3.taxableAmount.value
							break
							case 18:
							obj['taxSummary'].vat18+=e3.taxAmount.value
							obj['taxSummary'].vat0TaxableAmount+=e3.taxableAmount.value
							break
							default:
							obj['taxSummary'].vat18TaxableAmount+=e3.taxableAmount.value
							break
						}
					})
				})
				e['withholdingTaxTotal'].forEach((e2)=>{
					withholdingTaxTotal=withholdingTaxTotal + e2.taxAmount.value
				})
				obj['taxTotal']=taxTotal
				obj['withholdingTaxTotal']=withholdingTaxTotal
				obj['documentCurrencyCode']=e['documentCurrencyCode'].value
				obj['exchangeRate']=e['pricingExchangeRate'].calculationRate.value

				obj['lineCountNumeric']=e['lineCountNumeric'].value
				obj['localDocumentId']=e['localDocumentId']
				obj['invoiceStatus']=e['invoiceStatus']
				obj['invoiceErrors']=e['invoiceErrors']
				obj['localStatus']=e['localStatus']
				obj['localErrors']=e['localErrors']
				

				liste.push(obj)
			})
			resp.docs=liste
			cb(resp)
		} else {
			errorLog('error:',err)
		}
	})
}

function getInvoice(dbModel, member, req, res, next, cb){
	var _id= req.params.param2 || req.query._id || ''
	var includeAdditionalDocumentReference= req.query.includeAdditionalDocumentReference || false
	var select='-additionalDocumentReference'
	if(includeAdditionalDocumentReference==true)
		select=''

	if(_id=='')
		return error.param2(req,next)

	dbModel.invoices.findOne({_id:_id},select).exec((err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				var data=doc.toJSON()
				cb(data)
			}
		}
	})
}

function invoiceView(dbModel, member, req, res, next, cb){
	var _id= req.params.param2 || req.query._id || ''
	if(_id=='')
		return error.param2(req,next)

	dbModel.invoices.findOne({_id:_id}).populate(['html']).exec((err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				cb({file: doc.html})
			}
		}
	})
}

function invoicePdf(dbModel, member, req, res, next, cb){
	var _id= req.params.param2 || req.query._id || ''
	if(_id=='')
		return error.param2(req,next)

	dbModel.invoices.findOne({_id:_id}).populate(['pdf']).exec((err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				cb({file: doc.pdf})
			}
		}
	})
}

function getInvoiceXmlXslt(dbModel, member, req, res, next, cb){
	var _id= req.params.param2 || req.query._id || ''
	if(_id=='')
		return error.param2(req,next)
	dbModel.invoices.findOne({_id:_id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				var invoice=doc.toJSON()
				var xml=btoa(util.e_invoice2xml(invoice))
				var xslt=util.e_invoiceXslt(invoice)
				cb({xml:xml,xslt:xslt})
			}
		}
	})
}

function getEInvoiceUserList(dbModel, member, req, res, next, cb){
	var options={page: (req.query.page || 1), 
		limit:10
	}

	if((req.query.pageSize || req.query.limit)){
		options['limit']=req.query.pageSize || req.query.limit
	}

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

function sendToGib(dbModel, member, req, res, next, cb){
	var data = req.body || {}
	if(data.list==undefined)
		return next({code: 'ERROR', message: 'list is required.'})

	var populate={
		path:'eIntegrator'
	}

	var idList=[]
	var hata=false
	data.list.forEach((e)=>{
		if(e && typeof e === 'object' && e.constructor === Object){
			if(e._id!=undefined){
				idList.push(e._id)
			}else if(e.id!=undefined){
				idList.push(e.id)
			}else{
				hata=true
				return
			}
		}else{
			idList.push(e)
		}
	})
	if(hata)
		return next({code: 'ERROR', message: 'list is wrong.'})

	var filter={invoiceStatus:{$in:['Draft','Error']},_id:{$in:idList}}

	dbModel.invoices.find(filter).populate(populate).exec((err,docs)=>{
		if(dberr(err,next)){
			var index=0

			function pushTask(cb){
				if(index>=docs.length){
					cb(null)
				}else{
					
					var taskdata={taskType:'einvoice_send_to_gib',collectionName:'invoices',documentId:docs[index]._id,document:docs[index].toJSON()}
					taskHelper.newTask(dbModel, taskdata,(err,taskDoc)=>{
						if(!err){
							switch(taskDoc.status){
								case 'running':
								docs[index].status='Processing'
								break
								case 'pending':
								docs[index].invoiceStatus='Pending'
								break
								case 'completed':
								docs[index].invoiceStatus='Processing'
								break
								case 'error':
								docs[index].invoiceStatus='Error'
								break
								default:
								break
							}
							docs[index].save((err,newDoc)=>{
								if(!err){
									index++
									setTimeout(pushTask,0,cb)
								}else{
									cb(err)
								}
							})
						}else{
							cb(err)
						}
					})
				}
			}
			pushTask((err)=>{
				if(dberr(err,next)){
					var resp=[]
					docs.forEach((e)=>{
						resp.push(e._id.toString())
					})
					cb(resp)
				}
			})
		}
	})
}


function approveDeclineInvoice(type, dbModel,member,req,res,cb){
	var data = req.body || {}
	if(data.list==undefined)
		return next({code: 'ERROR', message: 'list is required.'})

	var taskType=''
	switch(type){
		case 'approve':
		taskType='einvoice_approve'
		break
		case 'decline':
		taskType='einvoice_decline'
		break
	}
	var populate={
		path:'eIntegrator'
	}
	var select='_id ID uuid eIntegrator'

	var idList=[]
	var hata=false
	data.list.forEach((e)=>{
		if(e && typeof e === 'object' && e.constructor === Object){
			if(e._id!=undefined){
				idList.push(e._id)
			}else if(e.id!=undefined){
				idList.push(e.id)
			}else{
				hata=true
				return
			}
		}else{
			idList.push(e)
		}
	})
	if(hata)
		return next({code: 'ERROR', message: 'list is wrong.'})
	var filter={invoiceStatus:'WaitingForApprovement',_id:{$in:idList}}

	dbModel.invoices.find(filter).select(select).populate(populate).exec((err,docs)=>{
		if(dberr(err,next)){
			var index=0

			function pushTask(cb){
				eventLog('docs.length:',docs.length)
				if(index>=docs.length){
					cb(null)
				}else{
					
					var taskdata={taskType: taskType,collectionName:'invoices',documentId:docs[index]._id,document:docs[index].toJSON()}
					taskHelper.newTask(dbModel, taskdata,(err,taskDoc)=>{
						if(!err){
							
							docs[index].save((err,newDoc)=>{
								if(!err){
									index++
									setTimeout(pushTask,0,cb)
								}else{
									cb(err)
								}
							})
						}else{
							cb(err)
						}
					})
				}
			}
			pushTask((err)=>{
				if(err){
					errorLog(err)
				}
				if(dberr(err,next)){
					var resp=[]
					
					docs.forEach((e)=>{
						resp.push(e._id.toString())
					})
					cb(resp)
				}
			})
		}
	})
}


function deleteItem(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	
	var data = req.body || {}
	data._id = req.params.param1

	dbModel.invoices.findOne({_id:data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				if(!(doc.invoiceStatus=='Draft' || doc.invoiceStatus=='Error' || doc.invoiceStatus=='Canceled' || doc.invoiceStatus=='Declined')){
					return next({code:'PERMISSION_DENIED',message:`Belgenin durumundan dolayi silinemez!`})
					dbModel.invoices.removeOne(member,{ _id: data._id},(err,doc)=>{
						if(dberr(err,next)){
							cb(null)
						}
					})
				}
			}
		}
	})
}
