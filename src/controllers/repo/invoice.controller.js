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
				if(req.params.param2 != undefined) {
					return getInvoice(dbModel, member, req, res, next, cb)
				} else {
					return getInvoiceList(1, dbModel, member, req, res, next, cb)
				}

				break
			case 'outbox':
				if(req.params.param2 != undefined) {
					return getInvoice(dbModel, member, req, res, next, cb)
				} else {
					return getInvoiceList(0, dbModel, member, req, res, next, cb)
				}
				break
			case 'print':
				return print(dbModel, member, req, res, next, cb)
				break
			case 'errors':
			case 'logs':
				restServices.eInvoice.get(dbModel, `/${req.params.param1}/${req.params.param2}`, {}, (err, data) => {
					if(dberr(err, next)) {
						cb(data)
					}
				})
				break
			case 'view':
			case 'xslt':
			case 'xml':
				restServices.eInvoice.getFile(dbModel, `/${req.params.param1}/${req.params.param2}`, {}, (err, data) => {
					if(dberr(err, next)) {
						cb({ file: { fileName: req.params.param2, data: data } })
					}
				})
				break

			case 'einvoiceuserlist':
				return getEInvoiceUserList(dbModel, member, req, res, next, cb)
			case 'errors':
				return getErrors(dbModel, member, req, res, next, cb)

			default:
				return getInvoice(dbModel, member, req, res, next, cb)
		}
	}

	function postData() {
		if(req.params.param1 != undefined) {
			switch (req.params.param1.lcaseeng()) {
				case 'send':
					if(req.params.param2 != undefined) {
						restServices.eInvoice.post(dbModel, `/send/${req.params.param2}`, req.body, (err, data) => {
							if(dberr(err, next)) {
								cb(data)
							}
						})
					} else {
						restServices.eInvoice.post(dbModel, `/send`, req.body, (err, data) => {
							if(dberr(err, next)) {
								cb(data)
							}
						})
					}
					break
				case 'approve':
					return approveDeclineInvoice('approve', dbModel, member, req, res, cb)
				case 'decline':
					return approveDeclineInvoice('decline', dbModel, member, req, res, cb)

				case 'importoutbox':
					return importOutbox(dbModel, member, req, res, next, cb)
				case 'copy':
					return copy(dbModel, member, req, res, next, cb)

				case 'inbox':
					req.body.ioType = 1
					return post(dbModel, member, req, res, next, cb)
				case 'outbox':
					req.body.ioType = 0
					return post(dbModel, member, req, res, next, cb)
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
	let newDoc = new dbModel.invoices(data)


	//newDoc.buyerCustomerParty.party.partyIdentification[0].ID.value = newDoc.invoiceLine.length.toString()
	newDoc = calculateInvoice(newDoc)
	cb(newDoc)

}

function amountType() { return { value: 0, attr: { currencyID: 'TRY' } } }


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
	if(JSON.stringify(source) === JSON.stringify(target)) {
		return true
	} else {
		return false
	}
}

function mergeTaxTotals(source, target, genelIndirimOran) {
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
				}
			})
			if(!bFound) {
				let k = clone(h)
				k.taxableAmount.value = h.taxableAmount.value * genelIndirimOran
				k.taxAmount.value = h.taxAmount.value * genelIndirimOran
				target.taxSubtotal.push(k)
			}

		})
	}
	// } catch {}
	//return target
}

function calculateInvoice(doc) {

	doc.documentCurrencyCode.value = doc.documentCurrencyCode.value || 'TRY'

	doc.lineCountNumeric = { value: doc.invoiceLine.length }

	let line_taxTotal = { taxAmount: amountType(), taxSubtotal: [] }
	let line_withholdingTaxTotal = { taxAmount: amountType(), taxSubtotal: [] }
	let satirdaVergiVarMi = false
	let genelIndirimOran = 1
	doc.legalMonetaryTotal.lineExtensionAmount = amountType()
	doc.legalMonetaryTotal.taxExclusiveAmount = amountType()
	doc.legalMonetaryTotal.taxInclusiveAmount = amountType()
	doc.legalMonetaryTotal.allowanceTotalAmount = amountType()
	doc.legalMonetaryTotal.chargeTotalAmount = amountType()
	doc.legalMonetaryTotal.payableRoundingAmount = amountType()
	doc.legalMonetaryTotal.payableAmount = amountType()
	doc.legalMonetaryTotal.payableAlternativeAmount = amountType()
	if(doc.legalMonetaryTotal.prepaidAmount)
		doc.legalMonetaryTotal.prepaidAmount.attr = { currencyID: doc.documentCurrencyCode.value }

	if(doc.invoiceLine.length == 0) {
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
				doc.legalMonetaryTotal.allowanceTotalAmount.value += e.amount.value
			} else {
				genelArtiEksi += e.amount.value
				doc.legalMonetaryTotal.chargeTotalAmount.value += e.amount.value
			}
		})
		doc.invoiceLine.forEach((line, index) => {
			let satirIndirim = 0,
				satirArtirim = 0
			let tutar = line.invoicedQuantity.value * line.price.priceAmount.value

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


	doc.invoiceLine.forEach((line, index) => {

		if(line.taxTotal) {
			satirdaVergiVarMi = true
			mergeTaxTotals(line.taxTotal, line_taxTotal, genelIndirimOran)
		}
		if(line.withholdingTaxTotal) {
			satirdaVergiVarMi = true
			mergeTaxTotals(line.withholdingTaxTotal, line_withholdingTaxTotal, genelIndirimOran)
		}
		let satirIndirim = 0
		let satirArtirim = 0

		let miktar = Number(line.invoicedQuantity.value)
		let fiyat = Number(line.price.priceAmount.value)
		let tutar = (miktar * fiyat).round(2)




		line.allowanceCharge.forEach((e) => {
			if(e.chargeIndicator.value == false) {
				satirIndirim += e.amount.value
			} else {
				satirArtirim += e.amount.value
			}
		})

		doc.legalMonetaryTotal.allowanceTotalAmount.value += satirIndirim
		doc.legalMonetaryTotal.chargeTotalAmount.value += satirArtirim
		line.lineExtensionAmount = {
			value: (tutar - satirIndirim + satirArtirim).round(2),
			attr: { currencyID: doc.documentCurrencyCode.value }
		}
		doc.legalMonetaryTotal.lineExtensionAmount.value += tutar.round(2)
		doc.legalMonetaryTotal.taxExclusiveAmount.value += (line.lineExtensionAmount.value * genelIndirimOran).round(2)
	})

	doc.legalMonetaryTotal.taxExclusiveAmount.value = doc.legalMonetaryTotal.taxExclusiveAmount.value.round(2)


	if(satirdaVergiVarMi) {
		doc.taxTotal = clone(line_taxTotal)
		if(line_withholdingTaxTotal.taxAmount.value > 0) {
			doc.withholdingTaxTotal = clone(line_withholdingTaxTotal)
		} else {
			doc.withholdingTaxTotal = null
		}
	}

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

	doc.legalMonetaryTotal.taxInclusiveAmount.value = doc.legalMonetaryTotal.taxExclusiveAmount.value + toplamVergi

	doc.legalMonetaryTotal.payableAmount.value = doc.legalMonetaryTotal.taxInclusiveAmount.value - tevkifEdilen

	return doc
}


function print(dbModel, member, req, res, next, cb) {
	let id = req.params.param2 || req.body['id'] || req.query.id || ''
	if(id == '')
		return error.param2(req, next)
	dbModel.invoices.findOne({ _id: id }, (err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				if(doc.ioType == 0) {
					let module = doc.ioType == 0 ? 'invoice.outbox' : 'invoice.inbox'
					printHelper.print(dbModel, module, doc, (req.query.designId || ''), (err, renderedCode) => {
						if(!err) {
							cb(renderedCode)
						} else {
							next(err)
						}
					})
				} else {
					restServices.eInvoice.getFile(dbModel, `/view/${id}`, {}, (err, data) => {

						if(dberr(err, next)) {
							cb({ file: { fileName: id, data: data } })
						}
					})
				}
			}
		}
	})
}

function copy(dbModel, member, req, res, next, cb) {
	let id = req.params.param2 || req.body['id'] || req.query.id || ''
	let newName = req.body['newName'] || req.body['name'] || ''
	if(id == '')
		return error.param2(req, next)

	dbModel.invoices.findOne({ _id: id }, (err, doc) => {
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

				let newDoc = new dbModel.invoices(data)
				if(!epValidateSync(newDoc, next))
					return
				newDoc.createdDate = new Date()
				newDoc.modifiedDate = new Date()
				newDoc.invoiceStatus = 'Draft'

				newDoc.invoiceErrors = []
				newDoc.localStatus = ''
				newDoc.localErrors = []
				newDoc.uuid.value = uuid.v4()
				dbModel.integrators.findOne({ _id: newDoc.eIntegrator }, (err, eIntegratorDoc) => {
					if(dberr(err, next)) {
						if(eIntegratorDoc == null) {
							return next({ code: 'ENTEGRATOR', message: 'Entegrator bulanamadi.' })
						}
						documentHelper.yeniFaturaNumarasi(dbModel, eIntegratorDoc, newDoc, (err, newDoc2) => {
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
	let newDoc = new dbModel.invoices(data)
	if(!epValidateSync(newDoc, next))
		return

	newDoc.uuid.value = uuid.v4()

	dbModel.integrators.findOne({ _id: newDoc.eIntegrator }, (err, eIntegratorDoc) => {
		if(dberr(err, next)) {
			if(eIntegratorDoc == null)
				return next({ code: 'ENTEGRATOR', message: 'Entegrator bulanamadi.' })
			documentHelper.yeniFaturaNumarasi(dbModel, eIntegratorDoc, newDoc, (err, newDoc) => {
				newDoc.lineCountNumeric = { value: newDoc.invoiceLine.length }
				newDoc=calculateInvoice(newDoc)
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
	dbModel.invoices.findOne({ _id: data._id }, (err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				data = util.amountValueFixed2Digit(data, '')
				doc = Object.assign(doc, data)
				if(doc.withholdingTaxTotal==undefined || doc.withholdingTaxTotal==[]){
					doc.withholdingTaxTotal=null
				}
			
				if(!epValidateSync(doc, next))
					return

				doc.lineCountNumeric = { value: doc.invoiceLine.length }
				doc.modifiedDate = new Date()
				doc=calculateInvoice(doc)

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
					documentHelper.insertEInvoice(dbModel, eIntegratorDoc, results, (err) => {
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
	let select = '_id profileId ID invoiceTypeCode localDocumentId issueDate ioType eIntegrator invoiceErrors localErrors invoiceStatus localStatus'

	if(_id == '')
		return error.param2(req, next)
	dbModel.invoices.findOne({ _id: _id }, select).exec((err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				let data = doc.toJSON()
				cb(data)
			}
		}
	})
}


function dataDuzelt(data) {
	if((data.location || '') == '')
		data.location = null
	if((data.location2 || '') == '')
		data.location2 = null

	if((data.receiptAdvice || '') == '')
		data.receiptAdvice = undefined

	if(data.invoiceLine) {
		data.invoiceLine.forEach((e) => {
			if(e.item)
				if((e.item._id || '') == '')
					e.item._id = null
		})
	}

	if((data.accountingCustomerParty || '') != '' && (data.buyerCustomerParty || '') == '') {
		data['buyerCustomerParty'] = clone(data.accountingCustomerParty)
	} else if((data.accountingCustomerParty || '') == '' && (data.buyerCustomerParty || '') != '') {
		data['accountingCustomerParty'] = clone(data.buyerCustomerParty)
	}
	if((data.accountingSupplierParty || '') != '' && (data.sellerSupplierParty || '') == '') {
		data['sellerSupplierParty'] = clone(data.accountingSupplierParty)
	} else if((data.accountingSupplierParty || '') == '' && (data.sellerSupplierParty || '') != '') {
		data['accountingSupplierParty'] = clone(data.sellerSupplierParty)
	}

	if((data.accountingCustomerParty || '') != '') {
		if((data.accountingCustomerParty.party || '') != '') {
			if((data.accountingCustomerParty.party._id || '') == '')
				data.accountingCustomerParty.party._id = null
		}
	}

	if((data.buyerCustomerParty || '') != '') {
		if((data.buyerCustomerParty.party || '') != '') {
			if((data.buyerCustomerParty.party._id || '') == '')
				data.buyerCustomerParty.party._id = null
		}
	}

	if((data.accountingSupplierParty || '') != '') {
		if((data.accountingSupplierParty.party || '') != '') {
			if((data.accountingSupplierParty.party._id || '') == '')
				data.accountingSupplierParty.party._id = null
		}
	}

	if((data.sellerSupplierParty || '') != '') {
		if((data.sellerSupplierParty.party || '') != '') {
			if((data.sellerSupplierParty.party._id || '') == '')
				data.sellerSupplierParty.party._id = null
		}
	}

	if(data.issueTime == undefined || data.issueTime == null) {
		data.issueTime = { value: (new Date()).hhmmss() }
	}
	if(data.issueTime.value.length < 8) {
		if(data.issueTime.value.length == 5) {
			data.issueTime.value += ':00'
		}
	}


	return data
}

function getInvoiceList(ioType, dbModel, member, req, res, next, cb) {
	let options = {
		page: (req.query.page || 1),
		populate: [
			{ path: 'eIntegrator', select: '_id eIntegrator name username' }
		],

		select: '_id ioType eIntegrator profileId ID uuid issueDate issueTime invoiceTypeCode lineCountNumeric invoiceLine localDocumentId accountingCustomerParty accountingSupplierParty invoiceStatus invoiceErrors localStatus localErrors legalMonetaryTotal documentCurrencyCode',
		sort: { 'issueDate.value': 'desc', 'ID.value': 'desc' }
	}

	if((req.query.pageSize || req.query.limit))
		options['limit'] = req.query.pageSize || req.query.limit

	// var filter = {}
	let filter = { ioType: ioType }

	if(req.query.eIntegrator)
		filter['eIntegrator'] = req.query.eIntegrator

	if((req.query.invoiceNo || req.query.ID || req.query['ID.value'] || '') != '') {
		if(filter['$or'] == undefined)
			filter['$or'] = []
		filter['$or'].push({ 'ID.value': { '$regex': '.*' + req.query.invoiceNo || req.query.ID || req.query['ID.value'] + '.*', '$options': 'i' } })
		filter['$or'].push({ 'localDocumentId': { '$regex': '.*' + req.query.invoiceNo || req.query.ID || req.query['ID.value'] + '.*', '$options': 'i' } })
	}

	if(req.query.invoiceStatus)
		filter['invoiceStatus'] = req.query.invoiceStatus

	if((req.query.profileId || req.query['profileId.value'] || '') != '')
		filter['profileId.value'] = req.query.profileId || req.query['profileId.value']

	if((req.query.invoiceTypeCode || req.query['invoiceTypeCode.value'] || '') != '')
		filter['invoiceTypeCode.value'] = req.query.invoiceTypeCode || req.query['invoiceTypeCode.value']


	if((req.query.date1 || '') != '')
		filter['issueDate.value'] = { $gte: req.query.date1 }


	if((req.query.date2 || '') != '') {
		if(filter['issueDate.value']) {
			filter['issueDate.value']['$lte'] = req.query.date2
		} else {
			filter['issueDate.value'] = { $lte: req.query.date2 }
		}
	}

	dbModel.invoices.paginate(filter, options, (err, resp) => {
		if(dberr(err, next)) {
			let liste = []
			iteration(resp.docs, (item, cb1) => {
				listeDuzenle(dbModel, item, (err, obj) => {
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
	obj['invoiceTypeCode'] = e['invoiceTypeCode'].value

	obj['party'] = { title: '', vknTckn: '' }
	if(e.ioType == 0) {
		obj['party']['title'] = e.accountingCustomerParty.party.partyName.name.value || (e.accountingCustomerParty.party.person.firstName.value + ' ' + e.accountingCustomerParty.party.person.familyName.value)
		e.accountingCustomerParty.party.partyIdentification.forEach((e2) => {
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
		obj['party']['title'] = e.accountingSupplierParty.party.partyName.name.value || (e.accountingSupplierParty.party.person.firstName.value + ' ' + e.accountingSupplierParty.party.person.familyName.value)
		e.accountingSupplierParty.party.partyIdentification.forEach((e2) => {
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

	obj['legalMonetaryTotal'] = e['legalMonetaryTotal']
	obj['documentCurrencyCode'] = e['documentCurrencyCode']
	obj['lineCountNumeric'] = e['lineCountNumeric'].value
	obj['localDocumentId'] = e['localDocumentId']
	obj['invoiceStatus'] = e['invoiceStatus']
	obj['invoiceErrors'] = e['invoiceErrors']
	obj['localStatus'] = e['localStatus']
	obj['localErrors'] = e['localErrors']
	obj['totalInvoicedQuantity'] = 0

	cb(null, obj)

}

function getInvoice(dbModel, member, req, res, next, cb) {
	let _id = ''
	if(req.params.param1 == 'inbox' && req.params.param2 != undefined) {
		_id = req.params.param2 || req.query._id || ''
	} else if(req.params.param1 == 'outbox' && req.params.param2 != undefined) {
		_id = req.params.param2 || req.query._id || ''
	} else {
		_id = req.params.param1 || req.query._id || ''
	}
	let includeAdditionalDocumentReference = req.query.includeAdditionalDocumentReference || false
	let select = '-additionalDocumentReference'
	if(includeAdditionalDocumentReference == true)
		select = ''

	if(_id == '')
		return error.param1(req, next)

	dbModel.invoices.findOne({ _id: _id }).select(select).exec((err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				if(!req.query.print) {
					let data = doc.toJSON()
					cb(data)
				} else {
					yazdir(dbModel, 'invoice', req, res, doc, (err, html) => {
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
		return printHelper.print(dbModel, 'invoice', doc, designId, cb)
	doc.populate('eIntegrator').execPopulate((err, doc2) => {
		if(dberr(err, next)) {
			if(doc2.eIntegrator.invoice.url == '')
				return printHelper.print(dbModel, 'invoice', doc, designId, cb)
			dbModel.services.eInvoice.xsltView(doc2, (err, html) => {
				if(dberr(err, next)) {
					cb(html)
				}
			})
		}
	})
}

function getEInvoiceUserList(dbModel, member, req, res, next, cb) {
	let options = {
		page: (req.query.page || 1),
		limit: 10
	}

	if((req.query.pageSize || req.query.limit))
		options['limit'] = req.query.pageSize || req.query.limit

	let filter = {}

	let vkn = req.query.vkn || req.query.tckn || req.query.vknTckn || req.query.taxNumber || req.query.identifier || ''

	if(vkn != '')
		filter['identifier'] = { '$regex': '.*' + vkn + '.*', '$options': 'i' }

	if((req.query.title || '') != '')
		filter['title'] = { '$regex': '.*' + req.query.title + '.*', '$options': 'i' }

	if(req.query.enabled)
		filter['enabled'] = Boolean(req.query.enabled)

	if((req.query.postboxAlias || '') != '')
		filter['postboxAlias'] = { $regex: '.*' + req.query.postboxAlias + '.*', $options: 'i' }


	db.einvoice_users.paginate(filter, options, (err, resp) => {
		if(dberr(err, next)) {
			cb(resp)
		}
	})
}

function deleteItem(dbModel, member, req, res, next, cb) {

	if(req.params.param1 == undefined)
		return error.param1(req, next)

	let data = req.body || {}
	data._id = req.params.param1

	dbModel.invoices.findOne({ _id: data._id }, (err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				if(!(doc.invoiceStatus == 'Draft' || doc.invoiceStatus == 'Error' || doc.invoiceStatus == 'Canceled' || doc.invoiceStatus == 'Declined')) {
					return next({ code: 'PERMISSION_DENIED', message: `Belgenin durumundan dolayi silinemez!` })
				} else {
					dbModel.invoices.removeOne(member, { _id: data._id }, (err, doc) => {
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
	if(dbModel.settings.invoice_inbox_auto_create_vendor && doc.ioType == 1) {
		autoCreateVendor(dbModel, doc, cb)
	} else if(dbModel.settings.invoice_outbox_auto_create_customer && doc.ioType == 0) {
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