module.exports = (dbModel, member, req, res, next, cb) => {
	switch (req.method) {
		case 'GET':
			if(req.params.param1 != undefined) {
				getOne(dbModel, member, req, res, next, cb)
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
		error.param2(req, next)

	dbModel.integrators.findOne({ _id: id }, (err, doc) => {
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
				data.createdDate = new Date()
				data.modifiedDate = new Date()
				data.passive = true

				saveFiles(dbModel, data, (err, data) => {
					let newDoc = new dbModel.integrators(data)
					if(!epValidateSync(newDoc, next))
						return
					newDoc.isDefault = false
					newDoc.save((err, newDoc2) => {
						if(dberr(err, next)) {
							cb(newDoc2)
						}
					})
				})
			}
		}
	})
}

function getList(dbModel, member, req, res, next, cb) {
	let options = {
		page: (req.query.page || 1)
	}

	if((req.query.pageSize || req.query.limit)) {
		options['limit'] = req.query.pageSize || req.query.limit
	} else {
		options['limit'] = 50000
	}

	let filter = {}
	if((req.query.passive || '') != '')
		filter['passive'] = req.query.passive


	dbModel.integrators.paginate(filter, options, (err, resp) => {
		if(dberr(err, next)) {
			cb(resp)
		}
	})
}

function getOne(dbModel, member, req, res, next, cb) {
	let populate = [
		{ path: 'invoice.xsltFiles', select: '_id name extension fileName data type size createdDate modifiedDate' },
		{ path: 'despatch.xsltFiles', select: '_id name extension fileName data type size createdDate modifiedDate' },
		{ path: 'order.xsltFiles', select: '_id name extension fileName data type size createdDate modifiedDate' },
		{ path: 'document.xsltFiles', select: '_id name extension fileName data type size createdDate modifiedDate' }
	]

	dbModel.integrators.findOne({ _id: req.params.param1 }).populate(populate).exec((err, doc) => {
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
	data = cleanDataEmptyLocalConnector(data)
	saveFiles(dbModel, data, (err, data) => {
		let newDoc = new dbModel.integrators(data)
		if(!epValidateSync(newDoc, next))
			return
		newDoc.save((err, newDoc2) => {
			if(dberr(err, next)) {
				if(newDoc2.isDefault) {
					dbModel.integrators.updateMany({ isDefault: true, _id: { $ne: newDoc2._id } }, { $set: { isDefault: false } }, { multi: true }, (err, resp) => {
						cb(newDoc2)
					})
				} else {
					cb(newDoc2)
				}
			}
		})
	})
}

function put(dbModel, member, req, res, next, cb) {
	if(req.params.param1 == undefined)
		return error.param1(req, next)

	let data = req.body || {}

	data._id = req.params.param1
	data.modifiedDate = new Date()

	dbModel.integrators.findOne({ _id: data._id }, (err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				data = cleanDataEmptyLocalConnector(data)
				saveFiles(dbModel, data, (err, data) => {
					Object.assign(doc, data)
					
					if(!epValidateSync(doc, next))
						return
					doc.save((err, newDoc2) => {
						if(dberr(err, next)) {
							if(newDoc2.isDefault) {
								dbModel.integrators.updateMany({ isDefault: true, _id: { $ne: newDoc2._id } }, { $set: { isDefault: false } }, { multi: true }, (err, resp) => {
									cb(newDoc2)
								})
							} else {
								cb(newDoc2)
							}
						}
					})
				})
			}
		}
	})
}

function saveFiles(dbModel, data, cb) {
	xsltKaydet(dbModel, data.invoice.xsltFiles, (err, array1) => {
		data.invoice.xsltFiles = array1
		if(array1.length > 0)
			data.invoice['xslt'] = array1[0]

		xsltKaydet(dbModel, data.despatch.xsltFiles, (err, array2) => {
			data.despatch.xsltFiles = array2
			if(array2.length > 0)
				data.despatch['xslt'] = array2[0]
			xsltKaydet(dbModel, data.document.xsltFiles, (err, array3) => {
				data.document.xsltFiles = array3
				if(array3.length > 0)
					data.document['xslt'] = array3[0]
				xsltKaydet(dbModel, data.order.xsltFiles, (err, array4) => {
					data.order.xsltFiles = array4
					if(array4.length > 0)
						data.order['xslt'] = array4[0]
					cb(null, data)
				})
			})
		})
	})
}

function xsltKaydet(dbModel, xsltFiles, cb) {
	if(xsltFiles == undefined)
		return cb(null, [])
	if(xsltFiles.length == 0)
		return cb(null, [])

	let dizi = []
	let index = 0

	function kaydet(cb) {
		if(index >= xsltFiles.length)
			return cb(null)
		let data = {
			data: xsltFiles[index].data,
			fileName: (xsltFiles[index].fileName || ''),
			name: (xsltFiles[index].name || ''),
			extension: (xsltFiles[index].extension || ''),
			type: (xsltFiles[index].type || 'text/plain')
		}
		if(data.fileName == '' && data.name == '') {
			index++
			setTimeout(kaydet, 0, cb)
			return
		}
		if((xsltFiles[index]._id || '') != '') {
			dbModel.files.findOne({ _id: xsltFiles[index]._id }, (err, doc) => {
				if(!err) {
					if(doc != null) {
						doc.data = data.data
						doc.fileName = data.fileName
						doc.name = data.name
						doc.extension = data.extension
						doc.type = data.type
						doc.save((err, doc2) => {
							if(!err) {
								dizi.push(doc2._id)
							} else {
								errorLog(err)
							}
							index++
							setTimeout(kaydet, 0, cb)
						})
					} else {
						let newFile = new dbModel.files(data)
						newFile.save((err, doc2) => {
							if(!err) {
								dizi.push(doc2._id)
							} else {
								errorLog(err)
							}
							index++
							setTimeout(kaydet, 0, cb)
						})
					}
				} else {
					index++
					setTimeout(kaydet, 0, cb)
				}
			})
		} else {
			let newFile = new dbModel.files(data)
			newFile.save((err, doc2) => {
				if(!err) {
					dizi.push(doc2._id)
				} else {
					errorLog(err)
				}
				index++
				setTimeout(kaydet, 0, cb)
			})
		}
	}

	kaydet((err) => {
		cb(null, dizi)
	})
}

function cleanDataEmptyLocalConnector(data) {
	if(data['invoice']) {
		if(data['invoice']['localConnector']) {
			if(data['invoice']['localConnector']['import']) {
				if(data['invoice']['localConnector']['import'].localConnector == '') {
					data['invoice']['localConnector']['import'].localConnector = undefined
					delete data['invoice']['localConnector']['import'].localConnector
				}
			}
			if(data['invoice']['localConnector']['export']) {
				if(data['invoice']['localConnector']['export'].localConnector == '') {
					data['invoice']['localConnector']['export'].localConnector = undefined
					delete data['invoice']['localConnector']['export'].localConnector
				}
			}
		}
	}

	if(data['despatch']) {
		if(data['despatch']['localConnector']) {
			if(data['despatch']['localConnector']['import']) {
				if(data['despatch']['localConnector']['import'].localConnector == '') {
					data['despatch']['localConnector']['import'].localConnector = undefined
					delete data['despatch']['localConnector']['import'].localConnector
				}
			}
			if(data['despatch']['localConnector']['export']) {
				if(data['despatch']['localConnector']['export'].localConnector == '') {
					data['despatch']['localConnector']['export'].localConnector = undefined
					delete data['despatch']['localConnector']['export'].localConnector
				}
			}
		}
	}
	if(data['document']) {
		if(data['document']['localConnector']) {
			if(data['document']['localConnector']['import']) {
				if(data['document']['localConnector']['import'].localConnector == '') {
					data['document']['localConnector']['import'].localConnector = undefined
					delete data['document']['localConnector']['import'].localConnector
				}
			}
			if(data['document']['localConnector']['export']) {
				if(data['document']['localConnector']['export'].localConnector == '') {
					data['document']['localConnector']['export'].localConnector = undefined
					delete data['document']['localConnector']['export'].localConnector
				}
			}
		}
	}

	if(data['order']) {
		if(data['order']['localConnector']) {
			if(data['order']['localConnector']['import']) {
				if(data['order']['localConnector']['import'].localConnector == '') {
					data['order']['localConnector']['import'].localConnector = undefined
					delete data['order']['localConnector']['import'].localConnector
				}
			}
			if(data['order']['localConnector']['export']) {
				if(data['order']['localConnector']['export'].localConnector == '') {
					data['order']['localConnector']['export'].localConnector = undefined
					delete data['order']['localConnector']['export'].localConnector
				}
			}
		}
	}
	if(data['ledger']) {
		if(data['ledger']['localConnector']) {
			if(data['ledger']['localConnector']['import']) {
				if(data['ledger']['localConnector']['import'].localConnector == '') {
					data['ledger']['localConnector']['import'].localConnector = undefined
					delete data['ledger']['localConnector']['import'].localConnector
				}
			}
			if(data['ledger']['localConnector']['export']) {
				if(data['ledger']['localConnector']['export'].localConnector == '') {
					data['ledger']['localConnector']['export'].localConnector = undefined
					delete data['ledger']['localConnector']['export'].localConnector
				}
			}
		}
	}
	return data
}


function deleteItem(dbModel, member, req, res, next, cb) {
	if(req.params.param1 == undefined)
		return error.param1(req, next)

	let data = req.body || {}
	data._id = req.params.param1
	dbModel.integrators.removeOne(member, { _id: data._id }, (err, doc) => {
		if(dberr(err, next))
			cb(null)
	})
}