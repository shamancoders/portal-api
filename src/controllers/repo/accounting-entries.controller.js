module.exports = (dbModel, member, req, res, next, cb) => {

	switch (req.method) {
		case 'GET':
			if(req.params.param1 != undefined) {
				if(req.params.param1.indexOf(',') > -1 || req.params.param1.indexOf(';') > -1) {
					getIdList(dbModel, member, req, res, next, cb)
				} else {
					getOne(dbModel, member, req, res, next, cb)
				}

			} else {
				getList(dbModel, member, req, res, next, cb)
			}
			break
		case 'POST':
			if(req.params.param1 == 'copy') {
				copy(dbModel, member, req, res, next, cb)
			} else {
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

function copy(dbModel, member, req, res, next, cb) {
	let id = req.params.param2 || req.body['id'] || req.query.id || ''
	let newName = req.body['newName'] || req.body['name'] || ''

	if(id == '')
		return error.param2(req, next)

	dbModel.accounting_entries.findOne({ _id: id }, (err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				let data = doc.toJSON()
				data._id = undefined
				delete data._id
				if(newName != '') {
					data.name = newName
				} else {
					data.name += ' copy'
				}

				let newDoc = new dbModel.accounting_entries(data)
				if(!epValidateSync(newDoc, next))
					return

				newDoc.save((err, newDoc2) => {
					if(dberr(err, next)) {
						let obj = newDoc2.toJSON()
						obj['newName'] = data.name
						cb(obj)
					}
				})
			}
		}
	})
}

function getList(dbModel, member, req, res, next, cb) {
	let options = {
		page: (req.query.page || 1),
		populate: [
			{ path: 'ledger', select: '_id ledgerYear ledgerPeriod uuid startJournalNumber endJournalNumber startJournalLineNumber endJournalLineNumber' }
		],
		sort: { documentDate: 1 },
		select: '-entryLine'
	}
	if((req.query.pageSize || req.query.limit))
		options['limit'] = req.query.pageSize || req.query.limit

	let filter = {}

	if((req.query.year || '') != '')
		filter['year'] = req.query.year

	if((req.query.period || '') != '')
		filter['period'] = req.query.period

	if((req.query.date1 || '') != '')
		filter['documentDate'] = { $gte: req.query.date1 }

	if((req.query.date2 || '') != '') {
		if(filter['documentDate']) {
			filter['documentDate']['$lte'] = req.query.date2
		} else {
			filter['documentDate'] = { $lte: req.query.date2 }
		}
	}

	if((req.query.documentType || '') != '')
		filter['documentType'] = req.query.documentType

	if((req.query.paymentMethod || '') != '')
		filter['paymentMethod'] = req.query.paymentMethod


	// if((req.query.search || '').trim()!='')
	// 	filter['name']={ '$regex': '.*' + req.query.search + '.*' ,'$options': 'i' }

	dbModel.accounting_entries.paginate(filter, options, (err, resp) => {
		if(dberr(err, next)) {
			cb(resp)
		}
	})
}

function getIdList(dbModel, member, req, res, next, cb) {

	let filter = {}
	let idList = req.params.param1.replaceAll(';', ',').split(',')

	filter['_id'] = { $in: idList }

	dbModel.accounting_entries.find(filter).select('-entryLine').exec((err, docs) => {
		if(dberr(err, next)) {
			cb(docs)
		}
	})
}

function getOne(dbModel, member, req, res, next, cb) {
	dbModel.accounting_entries.findOne({ _id: req.params.param1 }).exec((err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				cb(doc)
			}
		}
	})
}

function post(dbModel, member, req, res, next, cb) {
	let data = req.body || {}
	data._id = undefined

	data = veriTemizle(data)


	let newDoc = new dbModel.accounting_entries(data)
	if(!epValidateSync(newDoc, next))
		return

	verileriKontrolEt(dbModel, member, newDoc, (err, newDoc) => {
		if(dberr(err, next)) {
			newDoc.save((err, newDoc2) => {
				if(dberr(err, next)) {
					iteration(newDoc2.entryLine, (item, cb1) => {
						hesapBakiyeleriGuncelle(dbModel, item.account, item.debit, item.credit, 0, 0, cb1)
					}, 0, true, (err) => {
						cb(newDoc2)
					})
				}
			})
		}
	})
}

function put(dbModel, member, req, res, next, cb) {
	if(req.params.param1 == undefined)
		return error.param2(req, next)

	let data = req.body || {}
	data._id = req.params.param1
	data.modifiedDate = new Date()

	data = veriTemizle(data)

	dbModel.accounting_entries.findOne({ _id: data._id }, (err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				let oldEntryLines = doc.entryLine || []
				let doc2 = Object.assign(doc, data)
				let newDoc = new dbModel.accounting_entries(doc2)
				if(!epValidateSync(newDoc, next))
					return
				verileriKontrolEt(dbModel, member, newDoc, (err, newDoc) => {
					if(dberr(err, next)) {
						// console.log(`eskiler:`,oldEntryLines)
						iteration(oldEntryLines, (oldLine, cb1) => {

							hesapBakiyeleriGuncelle(dbModel, oldLine.account.toString(), -1 * oldLine.debit, -1 * oldLine.credit, 0, 0, cb1)
						}, 0, true, (err) => {

							newDoc.save((err, newDoc2) => {
								if(dberr(err, next)) {
									//console.log(`yeniler:`,newDoc2.entryLine)
									iteration(newDoc2.entryLine, (newLine, cb1) => {
										//console.log(`item:`,item)
										hesapBakiyeleriGuncelle(dbModel, newLine.account.toString(), newLine.debit, newLine.credit, 0, 0, cb1)
									}, 0, true, (err) => {
										cb(newDoc2)
									})
								}
							})
						})

					}
				})
			}
		}
	})

}

function hesapBakiyeleriGuncelle(dbModel, accountId, debit, credit, quantityInput, quantityOutput, cb) {
	dbModel.accounts.findOne({ _id: accountId }, (err, doc) => {
		if(dberr(err, cb)) {
			if(dbnull(doc, cb)) {
				doc.debit += debit
				doc.credit += credit
				doc.balance = doc.debit - doc.credit
				doc.quantityInput += quantityInput
				doc.quantityOutput += quantityOutput
				doc.quantityBalance = doc.quantityInput - doc.quantityOutput
				doc.save((err, doc2) => {
					if(dberr(err, cb)) {
						if(doc.parentAccount) {
							hesapBakiyeleriGuncelle(dbModel, doc.parentAccount.toString(), debit, credit, quantityInput, quantityOutput, cb)
						} else {
							cb(null)
						}
					}
				})
			}
		}
	})
}

function verileriKontrolEt(dbModel, member, doc, cb) {
	try {
		doc.entryLine = doc.entryLine || []
		let hatalar = '',
			hataNo = 1
		if(doc.totalDebit != doc.totalCredit)
			hatalar += `Hata${hataNo++} Toplam borç ve alacak eşit değil.\n`

		let yil = Number(doc.year || 0)
		let ay = Number(doc.period || -1)
		let belgeYil = (new Date(doc.documentDate)).getFullYear()
		let belgeAy = (new Date(doc.documentDate)).getMonth() + 1

		if(!(yil == belgeYil && ay == belgeAy))
			hatalar += `Hata${hataNo++} Belge tarihi dönem içinde değil.\n`

		let index = 0

		function calistir(cb1) {
			if(index >= doc.entryLine.length)
				return cb1()
			let line = doc.entryLine[index]
			if((line.account || '') == '') {
				hatalar += `Hata${hataNo++} #${index+1}.Satırda hesap seçilmemiş.\n`
				index++
				setTimeout(calistir, 0, cb1)
				return
			}

			dbModel.accounts.findOne({ _id: line.account }, (err, accDoc) => {
				if(!err) {
					if(accDoc == null) {
						hatalar += `Hata${hataNo++} #${index+1}.Satır hesap bulunamadi veya silinmis\n`
						index++
						setTimeout(calistir, 0, cb1)
					} else {
						if(accDoc.hasChilderen) {
							hatalar += `Hata${hataNo++} #${index+1}.Satır '${accDoc.accountCode}-${accDoc.name}' hesabin alt hesaplari mevcut!\n`
							index++
							setTimeout(calistir, 0, cb1)
						} else {
							index++
							setTimeout(calistir, 0, cb1)
						}
					}
				} else {
					hatalar += `Hata${hataNo++} #${index+1}.Satır Error:${err.name} ${err.message}\n`
					index++
					setTimeout(calistir, 0, cb1)
				}
			})

		}

		calistir(() => {
			if(hatalar == '') {
				cb(null, doc)
			} else {
				cb({ code: 'SYNTAX_ERROR', message: hatalar })
			}
		})

	} catch (err) {
		errorLog(err)
		cb(err)
	}

}


function veriTemizle(data) {
	if(data.entryLine == undefined) data.entryLine = []

	data.lineCountNumeric = data.entryLine.length
	data.totalDebit = 0
	data.totalCredit = 0
	data.entryLine.forEach((e) => {
		e.debit = Number(e.debit).round(2)
		e.credit = Number(e.credit).round(2)
		data.totalDebit += e.debit
		data.totalCredit += e.credit
	})
	return data
}

function deleteItem(dbModel, member, req, res, next, cb) {
	if(req.params.param1 == undefined)
		return error.param1(req, next)
	let data = req.body || {}
	data._id = req.params.param1
	dbModel.accounting_entries.findOne({ _id: data._id }, (err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				iteration(doc.entryLine, (oldLine, cb1) => {
					hesapBakiyeleriGuncelle(dbModel, oldLine.account.toString(), -1 * oldLine.debit, -1 * oldLine.credit, 0, 0, cb1)
				}, 0, true, (err) => {
					dbModel.accounting_entries.removeOne(member, { _id: data._id }, (err, doc) => {
						if(dberr(err, next)) {
							cb(null)
						}
					})
				})
			}
		}
	})
}