module.exports = (dbModel, member, req, res, next, cb) => {

	switch (req.method) {
		case 'GET':
			return get()
			break
		case 'POST':
			if(req.params.param1 == 'copy') {
				return copy(dbModel, member, req, res, next, cb)
			} else if(req.params.param1 == 'calc') {
				return calc(dbModel, member, req, res, next, cb)
			} else {
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

	function get() {
		switch (req.params.param1.lcaseeng()) {
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

	function postData() {
		if(req.params.param1 != undefined) {
			switch (req.params.param1.lcaseeng()) {
				case 'send':
					if(req.params.param2 != undefined) {
						eOrderService.post(dbModel, `/send/${req.params.param2}`, req.body, (err, data) => {
							if(dberr(err, next)) {
								cb(data)
							}
						})
					} else {
						eOrderService.post(dbModel, `/send`, req.body, (err, data) => {
							if(dberr(err, next)) {
								cb(data)
							}
						})
					}
					break
				case 'approve':
					return approveDeclineOrder('approve', dbModel, member, req, res, cb)
				case 'decline':
					return approveDeclineOrder('decline', dbModel, member, req, res, cb)

				case 'importoutbox':
					return importOutbox(dbModel, member, req, res, next, cb)
				default:
					return error.method(req, next)

			}
		} else {
			return post(dbModel, member, req, res, next, cb)
		}

	}


}


function calc(dbModel, member, req, res, next, cb) {
	let data = req.body || {}
	data._id = undefined
	data = util.amountValueFixed2Digit(data, '')
	data = dataDuzelt(data)
	let newDoc = new dbModel.orders(data)


	newDoc.buyerCustomerParty.party.partyIdentification[0].ID.value = newDoc.orderLine.length.toString()
	newDoc = calculateOrder(newDoc)
	cb(newDoc)

}
function amountType(){ return { value: 0, attr: { currencyID: 'TRY' } } }


function compairTaxSubTotal(s, t) {
	let source = {
		percent: (s.percent || {}).value || 0,
		taxScheme_taxTypeCode: ((s.taxCategory || {}).taxScheme.taxTypeCode || {}).value || '',
		taxExemptionReasonCode: ((s.taxCategory || {}).taxExemptionReasonCode || {}).value || ''
	}
	let target = {
		percent: (t.percent || {}).value || 0,
		taxScheme_taxTypeCode: ((t.taxCategory || {}).taxScheme.taxTypeCode || {}).value || '',
		taxExemptionReasonCode: ((t.taxCategory || {}).taxExemptionReasonCode || {}).value || ''
	}
	if(JSON.stringify(source) === JSON.stringify(target)){
		console.log(`esit:`)
		return true
	}else{
		console.log(`esit degil:`)
		return false
	}
}

function mergeTaxTotals(source,target, genelIndirimOran) {
	// try {
		if(source.taxAmount.value > 0) {
			target.taxAmount.value += source.taxAmount.value * genelIndirimOran
			source.taxSubtotal.forEach((h) => {
				let bFound = false
				target.taxSubtotal.forEach((k) => {
					if(compairTaxSubTotal(h, k)) {
						bFound = true
						k.taxableAmount.value += h.taxableAmount.value * genelIndirimOran
						k.taxAmount.value += h.taxAmount.value * genelIndirimOran
						console.log(`bulundu target.taxSubtotal :\r\n`,target.taxSubtotal)
					}
				})
				if(!bFound) {
					let k=clone(h)
					k.taxableAmount.value = h.taxableAmount.value * genelIndirimOran
					k.taxAmount.value = h.taxAmount.value * genelIndirimOran
					target.taxSubtotal.push(k)
					console.log(`bulunmadi eklendi:target.taxSubtotal :\r\n`,target.taxSubtotal)
				}

			})
		}
	// } catch {}
	//return target
}

function calculateOrder(doc) {

	doc.documentCurrencyCode.value = doc.documentCurrencyCode.value || 'TRY'
	
	doc.lineCountNumeric = { value: doc.orderLine.length }

	let line_taxTotal = { taxAmount: amountType(), taxSubtotal: [] }
	let line_withholdingTaxTotal = { taxAmount: amountType(), taxSubtotal: [] }
	let satirdaVergiVarMi = false
	let genelIndirimOran = 1
	doc.anticipatedMonetaryTotal.lineExtensionAmount = amountType()
	doc.anticipatedMonetaryTotal.taxExclusiveAmount = amountType()
	doc.anticipatedMonetaryTotal.taxInclusiveAmount = amountType()
	doc.anticipatedMonetaryTotal.allowanceTotalAmount = amountType()
	doc.anticipatedMonetaryTotal.chargeTotalAmount = amountType()
	doc.anticipatedMonetaryTotal.payableRoundingAmount = amountType()
	doc.anticipatedMonetaryTotal.payableAmount = amountType()
	doc.anticipatedMonetaryTotal.payableAlternativeAmount = amountType()
	if(doc.anticipatedMonetaryTotal.prepaidAmount)
		doc.anticipatedMonetaryTotal.prepaidAmount.attr = { currencyID: doc.documentCurrencyCode.value }

	if(doc.orderLine.length == 0) {
		doc.taxTotal = { taxAmount: amountType(), taxSubtotal: [] }
		doc.withholdingTaxTotal = null
		doc.allowanceCharge = []
		return doc
	}
	if((doc.allowanceCharge || []).length > 0) {
		let satirToplam = 0
		let genelArtiEksi = 0
		doc.allowanceCharge.forEach((e) => {
			if(e.chargeIndicator.value == false) {
				genelArtiEksi -= e.amount.value
				doc.anticipatedMonetaryTotal.allowanceTotalAmount.value += e.amount.value
			} else {
				genelArtiEksi += e.amount.value
				doc.anticipatedMonetaryTotal.chargeTotalAmount.value += e.amount.value
			}
		})
		doc.orderLine.forEach((line, index) => {
			let satirIndirim = 0,
				satirArtirim = 0
			let tutar = line.orderedQuantity.value * line.price.priceAmount.value

			(line.allowanceCharge || []).forEach((e) => {
				if(e.chargeIndicator.value == false) {
					satirIndirim += e.amount.value
				} else {
					satirArtirim += e.amount.value
				}
			})
			if((tutar - satirIndirim + satirArtirim) >= 0) {
				satirToplam += tutar - satirIndirim + satirArtirim
			} else {
				//burada hata var demek lazim
			}
		})
		if(satirToplam > 0) {
			genelIndirimOran = 1 + (genelArtiEksi / satirToplam)
		}
	}


	doc.orderLine.forEach((line, index) => {

		if(line.taxTotal) {
			console.log(`index-${index}  line.taxTotal:`,line.taxTotal)
			satirdaVergiVarMi = true
			mergeTaxTotals(line.taxTotal,line_taxTotal, genelIndirimOran)
		}
		if(line.withholdingTaxTotal) {
			satirdaVergiVarMi = true
			mergeTaxTotals(line.withholdingTaxTotal,line_withholdingTaxTotal, genelIndirimOran)
		}
		let satirIndirim = 0
		let satirArtirim = 0
		
		let miktar=Number(line.orderedQuantity.value)
		let fiyat=Number(line.price.priceAmount.value)
		let tutar = (miktar*fiyat).round(2)
		

		

		line.allowanceCharge.forEach((e) => {
			if(e.chargeIndicator.value == false) {
				satirIndirim += e.amount.value
			} else {
				satirArtirim += e.amount.value
			}
		})

		doc.anticipatedMonetaryTotal.allowanceTotalAmount.value += satirIndirim
		doc.anticipatedMonetaryTotal.chargeTotalAmount.value += satirArtirim
		line.lineExtensionAmount = {
			value: (tutar - satirIndirim + satirArtirim).round(2),
			attr: { currencyID: doc.documentCurrencyCode.value }
		}
		doc.anticipatedMonetaryTotal.lineExtensionAmount.value += tutar.round(2)
		doc.anticipatedMonetaryTotal.taxExclusiveAmount.value += (line.lineExtensionAmount.value * genelIndirimOran).round(2)
	})

	doc.anticipatedMonetaryTotal.taxExclusiveAmount.value = doc.anticipatedMonetaryTotal.taxExclusiveAmount.value.round(2)


	if(satirdaVergiVarMi) {
		doc.taxTotal = clone(line_taxTotal)
		if(line_withholdingTaxTotal.taxAmount.value > 0) {
			doc.withholdingTaxTotal = clone(line_withholdingTaxTotal)
		} else {
			doc.withholdingTaxTotal = null
		}
	}

	tempLog('calculateOrder_taxTotal.json', JSON.stringify(doc.taxTotal, null, 2))
	let toplamVergi = 0,
		tevkifEdilen = 0

	if(doc.taxTotal) {
		try {
			doc.taxTotal.taxAmount.value = doc.taxTotal.taxAmount.value.round(2)
			toplamVergi = doc.taxTotal.taxAmount.value
		} catch {}

		(doc.taxTotal.taxSubTotal || []).forEach((e) => {
			try { e.taxableAmount.value = e.taxableAmount.value.round(2) } catch {}
			try { e.taxAmount.value = e.taxAmount.value.round(2) } catch {}
		})
	}
	if(doc.withholdingTaxTotal) {
		try {
			doc.withholdingTaxTotal.taxAmount.value = doc.taxTotal.taxAmount.value.round(2)
			tevkifEdilen = doc.withholdingTaxTotal.taxAmount.value
		} catch {}

		(doc.withholdingTaxTotal.taxSubTotal || []).forEach((e) => {
			try { e.taxableAmount.value = e.taxableAmount.value.round(2) } catch {}
			try { e.taxAmount.value = e.taxAmount.value.round(2) } catch {}
		})
	}

	doc.anticipatedMonetaryTotal.taxInclusiveAmount.value = doc.anticipatedMonetaryTotal.taxExclusiveAmount.value + toplamVergi

	doc.anticipatedMonetaryTotal.payableAmount.value = doc.anticipatedMonetaryTotal.taxInclusiveAmount.value - tevkifEdilen

	return doc
}

function print(dbModel, member, req, res, next, cb) {
	let id = req.params.param2 || req.body['id'] || req.query.id || ''
	if(id == '')
		return error.param2(req, next)

	dbModel.orders.findOne({ _id: id }, (err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				let module = doc.ioType == 0 ? 'order.outbox' : 'order.inbox'
				printHelper.print(dbModel, module, doc, (req.query.designId || ''), (err, renderedCode) => {
					if(!err) {
						cb(renderedCode)
					} else {
						next(err)
					}
				})
			}
		}
	})
}

function copy(dbModel, member, req, res, next, cb) {
	let id = req.params.param2 || req.body['id'] || req.query.id || ''
	let newName = req.body['newName'] || req.body['name'] || ''
	if(id == '')
		return error.param2(req, next)

	dbModel.orders.findOne({ _id: id }, (err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				let data = doc.toJSON()
				data._id = undefined
				delete data._id
				if(newName.length == 16) {
					data.ID.value = newName
				} else {
					data.ID.value = ''
				}

				let newDoc = new dbModel.orders(data)
				if(!epValidateSync(newDoc, next))
					return
				newDoc.createdDate = new Date()
				newDoc.modifiedDate = new Date()
				newDoc.orderStatus = 'Draft'
				newDoc.orderErrors = []
				newDoc.localErrors = []
				newDoc.uuid.value = uuid.v4()
				newDoc.issueDate.value = (new Date()).yyyymmdd()
				newDoc.issueTime.value = (new Date()).hhmmss()

				dbModel.integrators.findOne({ _id: newDoc.eIntegrator }, (err, eIntegratorDoc) => {
					if(dberr(err, next)) {
						if(eIntegratorDoc == null) {
							return next({ code: 'ENTEGRATOR', message: 'Entegrator bulanamadi.' })
						}
						documentHelper.yeniSiparisNumarasi(dbModel, eIntegratorDoc, newDoc, (err, newDoc2) => {
							newDoc2.save((err, newDoc3) => {
								if(dberr(err, next)) {
									let obj = newDoc3.toJSON()
									obj['newName'] = obj.ID.value
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

function post(dbModel, member, req, res, next, cb) {
	let data = req.body || {}
	data._id = undefined
	data = util.amountValueFixed2Digit(data, '')
	data = dataDuzelt(data)
	let newDoc = new dbModel.orders(data)
	if(!epValidateSync(newDoc, next))
		return

	newDoc.uuid.value = uuid.v4()

	dbModel.integrators.findOne({ _id: newDoc.eIntegrator }, (err, eIntegratorDoc) => {
		if(dberr(err, next)) {
			if(eIntegratorDoc == null)
				return next({ code: 'ENTEGRATOR', message: 'Entegrator bulanamadi.' })
			documentHelper.yeniSiparisNumarasi(dbModel, eIntegratorDoc, newDoc, (err, newDoc) => {
				newDoc.lineCountNumeric = { value: newDoc.orderLine.length }
				newDoc=calculateOrder(newDoc)
				newDoc.save((err, newDoc2) => {
					if(dberr(err, next)) {

						cb(newDoc2)
					}
				})
			})
		}
	})
}


function put(dbModel, member, req, res, next, cb) {
	if(req.params.param1 == undefined)
		return error.param1(req, next)

	let data = req.body || {}
	data._id = req.params.param1


	data = util.amountValueFixed2Digit(data, '')
	data = dataDuzelt(data)
	dbModel.orders.findOne({ _id: data._id }, (err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				data = util.amountValueFixed2Digit(data, '')
				doc = Object.assign(doc, data)
				if(doc.withholdingTaxTotal==undefined || doc.withholdingTaxTotal==[]){
					doc.withholdingTaxTotal=null
				}
			
				if(!epValidateSync(doc, next))
					return

				doc.lineCountNumeric = { value: doc.orderLine.length }
				doc.modifiedDate = new Date()
				doc=calculateOrder(doc)

				doc.save((err, newDoc2) => {
					if(dberr(err, next)) {
						cb(newDoc2)
					}
				})
			}
		}
	})
}




function importOutbox(dbModel, member, req, res, next, cb) {
	let data = req.body || {}

	if(!data.files)
		return next({ code: 'WRONG_PARAMETER', message: 'files elemani bulunamadi' })

	if(!Array.isArray(data.files))
		return next({ code: 'WRONG_PARAMETER', message: 'files elemani array olmak zorundadir' })

	if(data.files.length == 0)
		return next({ code: 'WRONG_PARAMETER', message: 'files elemani bos olamaz' })

	data.files.forEach((e) => {
		if(e.base64Data) {
			e['data'] = atob(e.base64Data)
		}
	})


	fileImporter.run(dbModel, (data.fileImporter || ''), data, (err, results) => {
		if(!err) {
			documentHelper.findDefaultEIntegrator(dbModel, (data.eIntegrator || ''), (err, eIntegratorDoc) => {
				if(dberr(err, next)) {
					documentHelper.insertEOrder(dbModel, eIntegratorDoc, results, (err) => {
						if(dberr(err, next))
							cb('ok')
					})
				}
			})
		} else {
			return next(err)
		}
	})

}

function getErrors(dbModel, member, req, res, next, cb) {
	let _id = req.params.param2 || req.query._id || ''
	let select = '_id profileId ID orderTypeCode localDocumentId issueDate ioType eIntegrator orderErrors localErrors orderStatus localStatus'

	if(_id == '')
		return error.param2(req, next)
	dbModel.orders.findOne({ _id: _id }, select).exec((err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				let data = doc.toJSON()
				cb(data)
			}
		}
	})
}

function dataDuzelt(data) {
	if(data.orderLine) {
		data.orderLine.forEach((e, index) => {
			if(e.item) {
				if((e.item._id || '') == '')
					e.item._id = undefined
			}
			e.ID = { value: (index + 1).toString() }
		})
	}


	return data
}


function getOrderList(ioType, dbModel, member, req, res, next, cb) {
	let options = {
		page: (req.query.page || 1),
		populate: [
			{ path: 'eIntegrator', select: '_id eIntegrator name username' }
		],
		select: '_id ioType eIntegrator profileId ID uuid issueDate issueTime orderTypeCode lineCountNumeric orderLine localDocumentId buyerCustomerParty sellerSupplierParty orderStatus orderErrors localStatus localErrors anticipatedMonetaryTotal documentCurrencyCode',
		sort :{ _id:-1}
		//sort: { 'issueDate.value': 'desc', 'ID.value': 'desc' }
	}

	if((req.query.pageSize || req.query.limit))
		options['limit'] = req.query.pageSize || req.query.limit

	let filter = { ioType: ioType }

	if(req.query.eIntegrator)
		filter['eIntegrator'] = req.query.eIntegrator

	if((req.query.orderNo || req.query.ID || req.query['ID.value'] || '') != '') {
		if(filter['$or'] == undefined)
			filter['$or'] = []
		filter['$or'].push({ 'ID.value': { '$regex': '.*' + req.query.orderNo || req.query.ID || req.query['ID.value'] + '.*', '$options': 'i' } })
		filter['$or'].push({ 'localDocumentId': { '$regex': '.*' + req.query.orderNo || req.query.ID || req.query['ID.value'] + '.*', '$options': 'i' } })
	}

	if(req.query.orderStatus)
		filter['orderStatus'] = req.query.orderStatus

	if((req.query.profileId || req.query['profileId.value'] || '') != '')
		filter['profileId.value'] = req.query.profileId || req.query['profileId.value']

	if((req.query.orderTypeCode || req.query['orderTypeCode.value'] || '') != '')
		filter['orderTypeCode.value'] = req.query.orderTypeCode || req.query['orderTypeCode.value']


	if((req.query.date1 || '') != '')
		filter['issueDate.value'] = { $gte: req.query.date1 }


	if((req.query.date2 || '') != '') {
		if(filter['issueDate.value']) {
			filter['issueDate.value']['$lte'] = req.query.date2
		} else {
			filter['issueDate.value'] = { $lte: req.query.date2 }
		}
	}

	dbModel.orders.paginate(filter, options, (err, resp) => {
		if(dberr(err, next)) {
			let liste = []
			iteration(resp.docs, (item, cb1) => {
				listeDuzenle(dbModel, item, (err, obj) => {
					if(obj)
						liste.push(obj)
					cb1(null)
				})

			}, 0, true, (err) => {

				resp.docs = liste
				cb(resp)
			})
		}
	})
}

function listeDuzenle(dbModel, e, cb) {
	let obj = {}
	obj['_id'] = e['_id']
	obj['eIntegrator'] = e['eIntegrator']
	obj['ioType'] = e['ioType']
	obj['profileId'] = e['profileId'].value
	obj['ID'] = e.ID.value
	obj['uuid'] = e['uuid'].value
	obj['issueDate'] = e['issueDate'].value
	obj['issueTime'] = e['issueTime'].value
	obj['orderTypeCode'] = e['orderTypeCode'].value

	obj['party'] = { title: '', vknTckn: '' }
	if(e.ioType == 0) {
		obj['party']['title'] = e.buyerCustomerParty.party.partyName.name.value || (e.buyerCustomerParty.party.person.firstName.value + ' ' + e.buyerCustomerParty.party.person.familyName.value)
		e.buyerCustomerParty.party.partyIdentification.forEach((e2) => {
			let schemeID = ''
			if(e2.ID.attr != undefined) {
				schemeID = (e2.ID.attr.schemeID || '').toLowerCase()
			}
			if(schemeID.indexOf('vkn') > -1 || schemeID.indexOf('tckn') > -1) {
				obj['party']['vknTckn'] = e2.ID.value || ''
				return
			}
		})
	} else {
		obj['party']['title'] = e.sellerSupplierParty.party.partyName.name.value || (e.sellerSupplierParty.party.person.firstName.value + ' ' + e.sellerSupplierParty.party.person.familyName.value)
		e.sellerSupplierParty.party.partyIdentification.forEach((e2) => {
			let schemeID = ''
			if(e2.ID.attr != undefined) {
				schemeID = (e2.ID.attr.schemeID || '').toLowerCase()
			}

			if(schemeID.indexOf('vkn') > -1 || schemeID.indexOf('tckn') > -1) {
				obj['party']['vknTckn'] = e2.ID.value || ''
				return
			}

		})
	}

	obj['anticipatedMonetaryTotal'] = e['anticipatedMonetaryTotal']
	obj['documentCurrencyCode'] = e['documentCurrencyCode']
	obj['lineCountNumeric'] = e['lineCountNumeric'].value
	obj['localDocumentId'] = e['localDocumentId']
	obj['orderStatus'] = e['orderStatus']
	obj['orderErrors'] = e['orderErrors']
	obj['localStatus'] = e['localStatus']
	obj['localErrors'] = e['localErrors']
	cb(null, obj)

}

function getOrder(dbModel, member, req, res, next, cb) {
	let _id = req.params.param1 || req.query._id || ''
	let includeAdditionalDocumentReference = req.query.includeAdditionalDocumentReference || false
	let select = '-additionalDocumentReference'
	if(includeAdditionalDocumentReference == true)
		select = ''

	if(_id == '')
		return error.param1(req, next)

	dbModel.orders.findOne({ _id: _id }).select(select).exec((err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				if(!req.query.print) {
					let data = doc.toJSON()
					cb(data)
				} else {
					yazdir(dbModel, 'order', req, res, doc, (err, html) => {
						if(dberr(err, next))
							cb({ file: { data: html } })
					})
				}
			}
		}
	})
}

function yazdir(dbModel, moduleName, req, res, doc, cb) {
	let designId = req.query.designId || ''
	if((doc.eIntegrator || '') == '')
		return printHelper.print(dbModel, 'order', doc, designId, cb)
	doc.populate('eIntegrator').execPopulate((err, doc2) => {
		if(dberr(err, next)) {
			if(doc2.eIntegrator.order.url == '')
				return printHelper.print(dbModel, 'order', doc, designId, cb)
			dbModel.services.eOrder.xsltView(doc2, (err, html) => {
				if(dberr(err, next)) {
					cb(html)
				}
			})
		}
	})
}

function deleteItem(dbModel, member, req, res, next, cb) {
	console.log('order.deleteItem calisti')
	if(req.params.param1 == undefined)
		return error.param1(req, next)

	let data = req.body || {}
	data._id = req.params.param1

	dbModel.orders.findOne({ _id: data._id }, (err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				if(!(doc.orderStatus == 'Draft' || doc.orderStatus == 'Error' || doc.orderStatus == 'Canceled' || doc.orderStatus == 'Declined')) {
					return next({ code: 'PERMISSION_DENIED', message: `Belgenin durumundan dolayi silinemez!` })
				} else {
					dbModel.orders.removeOne(member, { _id: data._id }, (err, doc) => {
						if(dberr(err, next)) {
							cb(null)
						}
					})
				}
			}
		}
	})
}


function autoCreateCariKart(dbModel, doc, cb) {
	if(dbModel.settings.order_inbox_auto_create_vendor && doc.ioType == 1) {
		autoCreateVendor(dbModel, doc, cb)
	} else if(dbModel.settings.order_outbox_auto_create_customer && doc.ioType == 0) {
		autoCreateCustomer(dbModel, doc, cb)
	} else {
		if(cb)
			cb(null)
	}
}

function autoCreateVendor(dbModel, doc, cb) {

	let newDoc = new dbModel.parties(data)
	if(!epValidateSync(newDoc, next))
		return

}


function autoCreateCustomer(dbModel, doc, cb) {

}