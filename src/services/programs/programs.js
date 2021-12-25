exports.run = (dbModel, programDoc, data, cb) => {
	switch (programDoc.type) {
		case 'collection-process':
			collectionProcess(dbModel, programDoc, data, cb)
			break
		case 'file-importer':
			fileImporter(dbModel, programDoc, data, cb)
			break
		case 'file-exporter':
			fileExporter(dbModel, programDoc, data, cb)
			break
		case 'connector-importer':
			connectorImporter(dbModel, programDoc, data, cb)
			break
		case 'connector-exporter':
			connectorExporter(dbModel, programDoc, data, cb)
			break
		case 'email':
			emailSender(dbModel, programDoc, data, cb)
			break
		case 'sms':
			cb(null, data)
			break
		default:
			cb({ code: 'WRONG_PARAMETER', message: 'Yanlis program parametresi' })
			break
	}
}

function connectorExporter(dbModel, programDoc, data, cb) {
	if(programDoc.collections.length == 0)
		return cb({ code: 'WRONG_PARAMETER', message: 'Collection secilmemis' })
	if(programDoc.collections[0].name == '')
		return cb({ code: 'WRONG_PARAMETER', message: 'Collection secilmemis' })

	var data2 = dataDuzelt(data)

	var collection = clone(programDoc.collections[0])

	if((collection.filter || '').trim() != '') {
		if(!(collection.filter.trim().substr(0, 1) == '{' && collection.filter.trim().substr(-1, 1) == '}')) {
			collection.filter = '{' + collection.filter + '}'
		}
		try {
			collection.filter = JSON.parse(collection.filter)
		} catch (tryErr) {}
	}

	if((collection.updateExpression || '').trim() != '') {
		if(!(collection.updateExpression.trim().substr(0, 1) == '{' && collection.updateExpression.trim().substr(-1, 1) == '}')) {
			collection.updateExpression = '{' + collection.updateExpression + '}'
		}
		try {
			collection.updateExpression = JSON.parse(collection.updateExpression)
		} catch (tryErr) {}
	}

	if((collection.updateErrorExpression || '').trim() != '') {
		if(!(collection.updateErrorExpression.trim().substr(0, 1) == '{' && collection.updateErrorExpression.trim().substr(-1, 1) == '}')) {
			collection.updateErrorExpression = '{' + collection.updateErrorExpression + '}'
		}
		try {
			collection.updateErrorExpression = JSON.parse(collection.updateErrorExpression)
		} catch (tryErr) {}
	}


	getSelectedDataFromCollection(dbModel, collection, data2, (err, docs) => {
		if(!err) {
			iteration(docs, (item, cb2) => {
				util.renderFiles(programDoc.files, item, (err, renderedCode) => {
					if(!err) {
						var data = {}
						data = Object.assign({}, data, programDoc.connector)
						if(programDoc.connector.connectionType == 'mssql' || programDoc.connector.connectionType == 'mysql') {
							data.query = renderedCode
						} else {
							data.content = renderedCode
						}

						restServices.connector.request(`/${dbModel._id}/send`, { method: 'POST', body: data }, {}, (err, data) => {
							if(err && collection.updateErrorExpression) {
								updateOneDocument(item, collection.updateErrorExpression, err, (err2) => {
									cb2(err, data)
								})
							} else if(!err && collection.updateExpression) {
								updateOneDocument(item, collection.updateExpression, null, (err2) => {
									cb2(err, data)
								})
							} else {
								cb2(err, data)
							}
						})
					} else {
						if(collection.updateErrorExpression) {
							updateOneDocument(item, collection.updateErrorExpression, err, (err2) => {

								cb2(err, data)
							})
						} else {
							cb2(err)
						}
					}
				})
			}, 500, true, (err) => { })
			console.log(`docs:`,docs)
			cb(null, `${docs.length} adet görev çalıştırılmak üzere kuyruğa alındı`)
		} else {
			cb(err)
		}
	})
}


function collectionProcess(dbModel, programDoc, data, cb) {
	if(programDoc.collections.length == 0)
		return cb({ code: 'WRONG_PARAMETER', message: 'Collection secilmemis' })
	if(programDoc.collections[0].name == '')
		return cb({ code: 'WRONG_PARAMETER', message: 'Collection secilmemis' })

	var data2 = dataDuzelt(data)
	var collection = clone(programDoc.collections[0])

	if((collection.filter || '').trim() != '') {
		if(!(collection.filter.trim().substr(0, 1) == '{' && collection.filter.trim().substr(-1, 1) == '}')) {
			collection.filter = '{' + collection.filter + '}'
		}
		try {
			collection.filter = JSON.parse(collection.filter)
		} catch (tryErr) {
			console.error('tryError1:', tryErr)
		}
	}

	if((collection.updateExpression || '').trim() != '') {
		if(!(collection.updateExpression.trim().substr(0, 1) == '{' && collection.updateExpression.trim().substr(-1, 1) == '}')) {
			collection.updateExpression = '{' + collection.updateExpression + '}'
		}
		try {
			collection.updateExpression = JSON.parse(collection.updateExpression)
		} catch (tryErr) {
			console.error('tryError2:', tryErr)
		}
	}

	if((collection.updateErrorExpression || '').trim() != '') {
		if(!(collection.updateErrorExpression.trim().substr(0, 1) == '{' && collection.updateErrorExpression.trim().substr(-1, 1) == '}')) {
			collection.updateErrorExpression = '{' + collection.updateErrorExpression + '}'
		}
		try {
			collection.updateErrorExpression = JSON.parse(collection.updateErrorExpression)
		} catch (tryErr) {
			console.error('tryError3:', tryErr)
		}
	}


	getSelectedDataFromCollection(dbModel, collection, data2, (err, docs) => {
		if(!err) {
			var tempIndex = 0
			var sonuc = ''
			var hatalar = ''

			updateManyDocuments(docs, collection.updateExpression, null, (err2) => {
				if(!err2) {
					cb(null, `${docs.length} adet item guncellendi`)
				} else {
					updateManyDocuments(docs, collection.updateErrorExpression, err2, (err3) => {
						cb(err2)
					})
				}

			})
		} else {
			cb(err)
		}
	})
}

function fileExporter(dbModel, programDoc, data, cb) {
	if(programDoc.collections.length == 0)
		return cb({ code: 'WRONG_PARAMETER', message: 'Collection secilmemis' })
	if(programDoc.collections[0].name == '')
		return cb({ code: 'WRONG_PARAMETER', message: 'Collection secilmemis' })

	var data2 = dataDuzelt(data)
	var collection = clone(programDoc.collections[0])

	if((collection.filter || '').trim() != '') {
		if(!(collection.filter.trim().substr(0, 1) == '{' && collection.filter.trim().substr(-1, 1) == '}')) {
			collection.filter = '{' + collection.filter + '}'
		}
		try {
			collection.filter = JSON.parse(collection.filter)
		} catch (tryErr) {
			console.error('tryError1:', tryErr)
		}
	}

	if((collection.updateExpression || '').trim() != '') {
		if(!(collection.updateExpression.trim().substr(0, 1) == '{' && collection.updateExpression.trim().substr(-1, 1) == '}')) {
			collection.updateExpression = '{' + collection.updateExpression + '}'
		}
		try {
			collection.updateExpression = JSON.parse(collection.updateExpression)
		} catch (tryErr) {
			console.error('tryError2:', tryErr)
		}
	}

	if((collection.updateErrorExpression || '').trim() != '') {
		if(!(collection.updateErrorExpression.trim().substr(0, 1) == '{' && collection.updateErrorExpression.trim().substr(-1, 1) == '}')) {
			collection.updateErrorExpression = '{' + collection.updateErrorExpression + '}'
		}
		try {
			collection.updateErrorExpression = JSON.parse(collection.updateErrorExpression)
		} catch (tryErr) {
			console.error('tryError3:', tryErr)
		}
	}
	getSelectedDataFromCollection(dbModel, collection, data2, (err, docs) => {
		if(!err) {
			var tempIndex = 0
			var sonuc = ''
			var hatalar = ''
			// iteration(docs,(item,cb2)=>{
			// 		tempIndex++
			util.renderFiles(programDoc.files, docs, (err, renderedCode) => {
				if(!err) {
					runRendered(renderedCode, (err, data) => {
						if(err) {
							updateManyDocuments(docs, collection.updateErrorExpression, err, (err2) => {
								cb(err, data)
							})
						} else {
							updateManyDocuments(docs, collection.updateExpression, null, (err2) => {
								cb(err, data)
							})
						}
					})
				} else {
					updateManyDocuments(docs, collection.updateErrorExpression, err, (err2) => {
						cb(err)
					})
				}
			})
			// 	}
			// 	,500,false,(err)=>{
			// 		cb(err,sonuc)
			// })
		} else {
			console.error('err3:', err)
			cb(err)
		}
	})
}

function fileImporter(dbModel, programDoc, data, cb) {
	if(programDoc.collections.length == 0)
		return cb({ code: 'WRONG_PARAMETER', message: 'Collection secilmemis' })
	if(programDoc.collections[0].name == '')
		return cb({ code: 'WRONG_PARAMETER', message: 'Collection secilmemis' })

	data = dataDuzelt(data)

	util.renderFiles(programDoc.files, data, (err, renderedCode) => {
		if(!err) {

			runRendered(renderedCode, (err, veri) => {

				if(!err) {
					var dizi = []
					if(!Array.isArray(veri)) {
						dizi.push(veri)
					} else {
						dizi = veri
					}

					dizi.forEach((e) => {
						if(e.collection == undefined)
							e.collection = programDoc.collections[0].name
					})

					var collection = dizi[0].collection
					var s = ''
					switch (collection) {
						case 'invoices':
							s = 'fatura'
							break
						case 'despatches':
							s = 'irsaliye'
							break
						case 'orders':
							s = 'sipariş'
							break
						case 'orders':
							s = 'mahsup fişi'
							break
						default:
							s = collection
							break
					}

					insertUpdateCollection(dbModel, dizi, (err) => {
						var data = {}
						if(!err) {
							data.status = 'success'
							data.text = `${dizi.length} adet ${s} içeri alma islemi basarili`
							cb(null, data.text)
						} else {
							data.status = 'error'
							data.text = `${s} içeri alma işleminde hata: ${err.name || err.code} - ${err.message || err.name}`
							cb(err)
						}

						restServices.ispiyon.post(dbModel, `/notify`, data)
					})
				} else {
					cb(err)
				}
			})
		} else {
			cb(err)
		}
	})
}

function emailSender(dbModel, programDoc, data, cb) {
	if(programDoc.collections.length == 0)
		return cb({ code: 'WRONG_PARAMETER', message: 'Collection secilmemis' })
	if(programDoc.collections[0].name == '')
		return cb({ code: 'WRONG_PARAMETER', message: 'Collection secilmemis' })

	var data2 = dataDuzelt(data)
	var collection = clone(programDoc.collections[0])

	if((collection.filter || '').trim() != '') {
		if(!(collection.filter.trim().substr(0, 1) == '{' && collection.filter.trim().substr(-1, 1) == '}')) {
			collection.filter = '{' + collection.filter + '}'
		}
		try {
			collection.filter = JSON.parse(collection.filter)
		} catch (tryErr) {}
	}

	if((collection.updateExpression || '').trim() != '') {
		if(!(collection.updateExpression.trim().substr(0, 1) == '{' && collection.updateExpression.trim().substr(-1, 1) == '}')) {
			collection.updateExpression = '{' + collection.updateExpression + '}'
		}
		try {
			collection.updateExpression = JSON.parse(collection.updateExpression)
		} catch (tryErr) {}
	}

	if((collection.updateErrorExpression || '').trim() != '') {
		if(!(collection.updateErrorExpression.trim().substr(0, 1) == '{' && collection.updateErrorExpression.trim().substr(-1, 1) == '}')) {
			collection.updateErrorExpression = '{' + collection.updateErrorExpression + '}'
		}
		try {
			collection.updateErrorExpression = JSON.parse(collection.updateErrorExpression)
		} catch (tryErr) {}
	}

	getSelectedDataFromCollection(dbModel, collection, data2, (err, docs) => {
		if(!err) {
			util.renderFiles(programDoc.files, docs, (err, renderedCode) => {
				if(!err) {
					runRendered(renderedCode, (err, veri) => {
						if(!err) {
							var dizi = []
							if(!Array.isArray(veri)) {
								dizi.push(veri)
							} else {
								dizi = veri
							}
							dizi.forEach((e) => {
								if(e.from == undefined)
									e.from = programDoc.emailSender.from
							})
							cb(null, 'mail sent') //qwerty
						} else {
							cb(err)
						}
					})
				} else {
					cb(err)
				}
			})
		} else {
			cb(err)
		}
	})
}

function getSelectedDataFromCollection(dbModel, collection, data, cb) {
	var idList = []
	if(!Array.isArray(data)) {
		if(data.list != undefined) {
			data.list.forEach((e) => {
				if(e && typeof e === 'object' && e.constructor === Object) {
					if(e._id != undefined) {
						idList.push(e._id)
					} else if(e.id != undefined) {
						idList.push(e.id)
					} else {
						return cb({ code: 'ERROR', message: 'list is wrong.' })
					}
				} else {
					idList.push(e)
				}
			})
		} else {
			if(typeof data == 'string') {
				idList.push(data)
			} else if(data && typeof data === 'object' && data.constructor === Object) {

			} else {
				return cb({ code: 'WRONG_DATA', message: 'Hatali liste verisi. ornek:  list=[{"_id":"xxxxxxx"},{"_id":"yyyyyyyy"}' })
			}
		}
	} else {
		data.forEach((e) => {
			if(e && typeof e === 'object' && e.constructor === Object) {
				if(e._id != undefined) {
					idList.push(e._id)
				} else if(e.id != undefined) {
					idList.push(e.id)
				} else {
					return cb({ code: 'ERROR', message: 'list is wrong.' })
				}
			} else {
				idList.push(e)
			}
		})
	}


	var filter = { _id: { $in: idList } }
	if(collection.filter) {
		Object.keys(collection.filter).forEach((k) => {
			filter[k] = collection.filter[k]
		})
	}

	var populate = []

	switch (collection.name) {
		case 'pos_device_zreports':
			populate = [{
				path: 'posDevice',
				populate: [
					{ path: 'location' },
					{ path: 'service', select: '_id name serviceType' }
				]
			}]
			break
	}

	dbModel[collection.name].find(filter).populate(populate).exec((err, docs) => {

		if(dberr(err, cb)) {
			cb(null, docs)

		}
	})
}


function updateOneDocument(doc, updateExp, err, cb) {
	Object.keys(updateExp).forEach((k) => {
		doc[k] = evalObjectValuesExpression(updateExp[k], doc.toJSON(), err)
	})
	doc.save((err, doc2) => {
		cb(err, doc2)
	})
}

function updateManyDocuments(docs, updateExp, err, cb) {
	iteration(docs, (doc, cb2) => {
		Object.keys(updateExp).forEach((k) => {
			doc[k] = evalObjectValuesExpression(updateExp[k], doc.toJSON(), err)
		})
		doc.save((err, doc2) => {
			cb2(err, doc2)
		})
	}, 0, true, (err2) => {
		cb(err2)
	})
}

function evalObjectValuesExpression(field, doc, err) {

	if(typeof field == 'string') {
		field = eval('\`' + field + '\`')
	} else if(Array.isArray(field)) {
		field.forEach((e) => {
			e = evalObjectValuesExpression(e, doc, err)
		})
	} else if(typeof field == 'object') {
		Object.keys(field).forEach((k) => {
			field[k] = evalObjectValuesExpression(field[k], doc, err)
		})
	}


	return field
}


function connectorImporter(dbModel, programDoc, data, cb) {
	try {
		if(programDoc.collections.length == 0)
			return cb({ code: 'WRONG_PARAMETER', message: 'Collection secilmemis' })
		if(programDoc.collections[0].name == '')
			return cb({ code: 'WRONG_PARAMETER', message: 'Collection secilmemis' })

		if(programDoc.connector.connectorId == '' || programDoc.connector.connectorPass == '' || programDoc.connector.connectionType == '')
			return cb({ code: 'WRONG_PARAMETER', message: 'connectorId, connectorPass, connectionType zorunludur' })

		util.renderFiles(programDoc.files, data, (err, renderedCode) => {
			if(!err) {
				var data = {}
				data = Object.assign({}, data, programDoc.connector)
				if(programDoc.connector.connectionType == 'mssql' || programDoc.connector.connectionType == 'mysql') {
					data.query = renderedCode
				} else {
					data.content = renderedCode
				}

				restServices.connector.post(dbModel, `/send`, data, (err, data) => {
					if(dberr(err, cb)) {

						if(typeof data == 'string') {
							data = JSON.parse(data)
						}
						var dizi = []
						if(!Array.isArray(data)) {
							dizi.push(data)
						} else {
							dizi = data
						}
						dizi.forEach((e) => {
							if(e.collection == undefined)
								e.collection = programDoc.collections[0].name
						})
						insertUpdateCollection(dbModel, dizi, cb)
					}
				})

			} else {
				cb(err)
			}
		})
	} catch (tryErr) {
		return cb({ code: tryErr.name || 'PARSING_ERROR', message: tryErr.message || 'connectorImporter error' })
	}
}




function dataDuzelt(data) {
	if(typeof data == 'string') {
		data = atob2(data)
		try {
			data = JSON.parse(data)
		} catch (err) {

		}
	} else {
		if(data.files != undefined) {
			data.files.forEach((e) => {
				e.data = atob2(e.data)
			})
		}
	}
	return data
}

function insertUpdateCollection(dbModel, data, callback) {
	try {
		iteration(data, (item, cb) => {
			var collection = item.collection
			item.collection = undefined
			var newDoc = dbModel[collection](item)
			if(!epValidateSync(newDoc, cb))
				return
			switch (collection) {
				case 'invoices':
					saveInvoice(dbModel, newDoc, cb)
					break
				case 'despatches':
					saveDespatch(dbModel, newDoc, cb)
					break
				default:
					newDoc.save((err, newDoc2) => {
						if(!err) {
							cb(null, newDoc2._id)
						} else {
							cb(err)
						}
					})
					break
			}
		}, 0, true, (err) => {
			callback(err)
		})
	} catch (tryErr) {
		callback({ code: tryErr.name || 'PARSING_ERROR', message: tryErr.message || 'execCmd error' })
	}
}


function saveDespatch(dbModel, newDoc, cb) {
	if(newDoc.localDocumentId == '')
		return cb(null)

	dbModel.despatches.findOne({ ioType: newDoc.ioType, localDocumentId: newDoc.localDocumentId }, (err, doc) => {
		if(dberr(err, cb)) {
			if(doc != null) {
				cb({ code: 'ALREADY_EXISTS', message: `${newDoc.localDocumentId} zaten var.` })
			} else {
				documentHelper.findDefaultEIntegrator(dbModel, (newDoc.eIntegrator || ''), (err, eIntegratorDoc) => {
					if(!err) {
						findPartyIdentification(dbModel, newDoc, (err, newDoc) => {

							documentHelper.yeniIrsaliyeNumarasi(dbModel, eIntegratorDoc, newDoc, (err, newDoc2) => {
								console.log(`documentHelper.yeniIrsaliyeNumarasi:`, newDoc2.ID.value)
								newDoc2.save((err, newDoc3) => {
									if(!err) {
										console.log(`newDoc3._id:`, newDoc3._id)
										var partyDizi = []
										if(newDoc3.ioType == 0) {
											if(newDoc3.deliveryCustomerParty) {
												if(newDoc3.deliveryCustomerParty.party) {
													var obj = clone(newDoc3.deliveryCustomerParty.party)
													obj['partyType'] = 'Customer'
													partyDizi.push(obj)
												}
											}
											if(newDoc3.buyerCustomerParty) {
												if(newDoc3.buyerCustomerParty.party) {
													var obj = clone(newDoc3.buyerCustomerParty.party)
													obj['partyType'] = 'Customer'
													partyDizi.push(obj)
												}
											}
										} else {
											if(newDoc3.despatchSupplierParty) {
												if(newDoc3.despatchSupplierParty.party) {
													var obj = clone(newDoc3.despatchSupplierParty.party)
													obj['partyType'] = 'Vendor'
													partyDizi.push(obj)
												}
											}
											if(newDoc3.sellerSupplierParty) {
												if(newDoc3.sellerSupplierParty.party) {
													var obj = clone(newDoc3.sellerSupplierParty.party)
													obj['partyType'] = 'Vendor'
													partyDizi.push(obj)
												}
											}
										}
										console.log(`burasi autoNewParties oncesi:`)
										autoNewParties(dbModel, partyDizi, () => {
											var dizi = []
											console.log(`burasi autoNewParties sonrasi:`)
											newDoc3.despatchLine.forEach((e) => {
												if(e.item) {
													if(e.item.name) {
														if(e.item.name.value) {
															dizi.push(clone(e.item))
														}
													}
												}

											})
											console.log(`newDoc3.despatchLine:`, newDoc3.despatchLine.length)

											autoNewItems(dbModel, dizi, () => {
												cb(null, newDoc3._id)
											})
										})
									} else {
										console.log(`err:`, err)
										cb(err)
									}
								})
							})
						})
					} else {
						cb(err)
					}
				})

			}
		}
	})
}

function findPartyIdentification(dbModel, doc, callback) {
	try {
		if(doc.ioType == 0) {
			dbModel.parties.findOne({ 'partyName.name.value': doc.deliveryCustomerParty.party.partyName.name.value }, (err, foundDoc) => {
				if(!err) {
					if(foundDoc != null) {
						doc.deliveryCustomerParty.party.partyTaxScheme = clone(foundDoc.partyTaxScheme)
						doc.deliveryCustomerParty.party.partyIdentification = clone(foundDoc.partyIdentification)
						doc.deliveryCustomerParty.party.postalAddress.room.value = doc.deliveryCustomerParty.party.postalAddress.room.value || foundDoc.postalAddress.room.value
						doc.deliveryCustomerParty.party.postalAddress.streetName.value = doc.deliveryCustomerParty.party.postalAddress.streetName.value || foundDoc.postalAddress.streetName.value
						doc.deliveryCustomerParty.party.postalAddress.blockName.value = doc.deliveryCustomerParty.party.postalAddress.blockName.value || foundDoc.postalAddress.blockName.value
						doc.deliveryCustomerParty.party.postalAddress.buildingName.value = doc.deliveryCustomerParty.party.postalAddress.buildingName.value || foundDoc.postalAddress.buildingName.value
						doc.deliveryCustomerParty.party.postalAddress.buildingNumber.value = doc.deliveryCustomerParty.party.postalAddress.buildingNumber.value || foundDoc.postalAddress.buildingNumber.value
						doc.deliveryCustomerParty.party.postalAddress.citySubdivisionName.value = doc.deliveryCustomerParty.party.postalAddress.citySubdivisionName.value || foundDoc.postalAddress.citySubdivisionName.value
						doc.deliveryCustomerParty.party.postalAddress.cityName.value = doc.deliveryCustomerParty.party.postalAddress.cityName.value || foundDoc.postalAddress.cityName.value
						doc.deliveryCustomerParty.party.postalAddress.district.value = doc.deliveryCustomerParty.party.postalAddress.district.value || foundDoc.postalAddress.district.value
						doc.deliveryCustomerParty.party.postalAddress.country.identificationCode.value = doc.deliveryCustomerParty.party.postalAddress.country.identificationCode.value || foundDoc.postalAddress.country.identificationCode.value
						doc.deliveryCustomerParty.party.postalAddress.country.name.value = doc.deliveryCustomerParty.party.postalAddress.country.name.value || foundDoc.postalAddress.country.name.value
						doc.deliveryCustomerParty.party._id = foundDoc._id
						callback(null, doc)
					} else {
						var bFound = false
						if(doc.deliveryCustomerParty.party.partyIdentification) {
							doc.deliveryCustomerParty.party.partyIdentification.forEach((e) => {
								if(e.ID) {
									if(e.ID.attr && e.ID.value != '') {
										if(e.ID.attr.schemeID == 'VKN' || e.ID.attr.schemeID == 'TCKN') {
											bFound = true
										}
									}
								}
							})
						}

						if(bFound == false) {
							dbModel.despatches.find({
								'deliveryCustomerParty.party.partyName.name.value': doc.deliveryCustomerParty.party.partyName.name.value,
								'deliveryCustomerParty.party.partyIdentification.ID.value': { $ne: '' },
								'deliveryCustomerParty.party.partyIdentification.ID.attr.schemeID': { $in: ['VKN', 'TCKN'] }
							}).sort({ _id: -1 }).limit(1).exec((err, foundDocs) => {
								if(!err) {
									if(foundDocs.length > 0) {
										doc.deliveryCustomerParty.party.partyIdentification = clone(foundDocs[0].deliveryCustomerParty.party.partyIdentification)
										doc.deliveryCustomerParty.party.partyTaxScheme = clone(foundDocs[0].deliveryCustomerParty.party.partyTaxScheme)
										callback(null, doc)
									} else {
										callback(null, doc)
									}
								} else {
									callback(null, doc)
								}
							})
						} else {
							callback(null, doc)
						}
					}
				} else {
					callback(null, doc)
				}
			})


		} else {
			callback(null, doc)
		}

	} catch (tryErr) {
		errorLog('findPartyIdentity', tryErr)
		callback(null, doc)
	}
}

function autoNewParties(dbModel, dizi, callback) {
	try {
		var index = 0

		function calistir(cb) {
			if(index >= dizi.length)
				return cb()

			dbModel.autonew_parties.find({ 'partyName.name.value': dizi[index].partyName.name.value }).limit(1).exec((err, docs) => {
				if(dberr(err, cb)) {
					if(docs.length == 0) {
						dbModel.parties.find({ 'partyName.name.value': dizi[index].partyName.name.value }).limit(1).exec((err, docs) => {
							if(dberr(err, cb)) {
								if(docs.length == 0) {
									var newDoc = new dbModel.autonew_parties(dizi[index])
									newDoc.save((err, newDoc2) => {
										index++
										setTimeout(calistir, 0, cb)
									})
								} else {
									index++
									setTimeout(calistir, 0, cb)
								}
							}
						})
					} else {
						index++
						setTimeout(calistir, 0, cb)
					}
				}
			})
		}

		calistir((err) => {
			callback(null)
		})
	} catch (tryErr) {
		errorLog('autoNewItems', tryErr)
		callback(null)
	}
}

function autoNewItems(dbModel, dizi, callback) {
	try {

		var index = 0

		function calistir(cb) {
			if(index >= dizi.length)
				return cb()

			dbModel.autonew_items.find({ 'name.value': dizi[index].name.value }).limit(1).exec((err, docs) => {
				if(dberr(err, cb)) {
					if(docs.length == 0) {
						dbModel.items.find({ 'name.value': dizi[index].name.value }).limit(1).exec((err, docs) => {
							if(dberr(err, cb)) {
								if(docs.length == 0) {
									dizi[index]['itemType'] = 'item'
									var newDoc = new dbModel.autonew_items(dizi[index])
									newDoc.save((err, newDoc2) => {
										index++
										setTimeout(calistir, 0, cb)
									})
								} else {
									index++
									setTimeout(calistir, 0, cb)
								}
							}
						})
					} else {
						index++
						setTimeout(calistir, 0, cb)
					}
				}
			})

		}

		calistir((err) => {
			callback(null)
		})
	} catch (tryErr) {
		errorLog('autoNewItems', tryErr)
		callback(null)
	}
}

function saveInvoice(dbModel, newDoc, cb) {
	if(newDoc.localDocumentId == '')
		return cb(null)

	dbModel.invoices.findOne({ ioType: newDoc.ioType, localDocumentId: newDoc.localDocumentId }, (err, doc) => {
		if(dberr(err, cb)) {
			if(doc != null) {
				cb(null, { success: false, error: { code: 'ALREADY_EXISTS', message: `${newDoc.localDocumentId} zaten var.` } })
			} else {
				newDoc.save((err, newDoc2) => {
					if(!err) {
						cb(null, { success: true, data: newDoc2._id })
					} else {
						cb(null, { success: false, error: err })
					}
				})
			}
		}
	})
}


function runRendered(renderedCode, cb) {
	try {
		var fileName = path.join(os.tmpdir(), 'tr216_' + uuid.v4() + '.js')


		fs.writeFile(fileName, renderedCode, 'utf8', (err) => {
			if(!err) {
				util.execCmd('node', [fileName, '-e'], (err, veri, stderr) => {
					if(stderr.trim() == '') {
						var data = ''
						try {
							data = JSON.parse(veri)
						} catch (e) {

							data = veri

						}

						cb(null, data)
						fs.unlinkSync(fileName)
					} else {
						cb({ code: 'cmd_JS_ERROR', message: stderr })
						fs.unlinkSync(fileName)
					}
				})
			} else {
				cb({ code: err.code || err.name || 'FILE_IMPORTER ERROR TEMP WRITE', message: err.message || 'FILE_IMPORTER ERROR TEMP WRITE' })
			}
		})


	} catch (tryErr) {
		return cb({ code: tryErr.name || 'PARSING_ERROR', message: tryErr.message || 'execCmd error' })
	}
}