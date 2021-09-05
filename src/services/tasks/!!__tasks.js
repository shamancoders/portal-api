global.taskHelper = require('./taskhelper.js')

exports.start=function(){

}
function calistir(dbModel){

	dbModel.check(()=>{
		if(dbModel.passive || dbModel.deleted || !dbModel.services.task){
			eventLog(`${dbModel.dbName} task servisi pasif`)
			return
		}
		dbModel.tasks.find({status:'pending'},(err,taskDocs)=>{
			if(!err){
				eventLog('(' + dbModel.dbName.green + ') Calistirilacak gorev sayisi:',taskDocs.length)
				var index=0
				function taskCalistir(cb){
					try{
						if(index>=taskDocs.length) return cb(null)
							var taskDoc=taskDocs[index]
						switch(taskDoc.taskType){
							case 'connector_transfer_zreport':
							connector_transfer_zreport(dbModel,taskDoc,(err)=>{
								index++
								setTimeout(taskCalistir,2000,cb)
							})
							break
							case 'connector_import_einvoice':
							index++
							setTimeout(taskCalistir,0,cb)
							break
							case 'einvoice_send_to_gib':
							index++
							setTimeout(taskCalistir,0,cb)
							break
							case 'edespatch_send_to_gib':
							index++
							setTimeout(taskCalistir,0,cb)
							break
							case 'einvoice_approve':
							index++
							setTimeout(taskCalistir,0,cb)
							break
							case 'einvoice_decline':
							index++
							setTimeout(taskCalistir,0,cb)
							break
							default:
							index++
							setTimeout(taskCalistir,0,cb)
							break
						}
					}catch(tryErr){
						index++
						setTimeout(taskCalistir,0,cb)
					}
				}

				taskCalistir((err)=>{
					setTimeout(calistir(dbModel,callback),20000)
				})

			}else{
				setTimeout(calistir(dbModel,callback),20000)
			}
		})
	})
	

	
	
}


function einvoice_approve(dbModel,taskDoc,cb){
	if(!taskDoc['document']){
		return taskHelper.setCancelled(taskDoc,cb)
	}
	if(taskDoc['document']['eIntegrator'] && dbModel){
		services.eInvoice.approveInvoice(dbModel,taskDoc['document'],(err)=>{
			if(!err){
				//dbModel.e_invoices.updateOne({_id:taskDoc.documentId} , {$set:{invoiceStatus:'Processing',invoiceErrors:[],'uuid.value':yeniUUID}},(err2)=>{
					taskHelper.setCompleted(taskDoc,cb)
				//})
			}else{
				dbModel.e_invoices.findOne({_id:taskDoc.documentId},(err33,doc)=>{
					if(!err33){
						if(doc!=null){
							doc.invoiceErrors.push({code:(err.name || err.code || 'APPROVE_INVOICE'),message:(err.message || 'Fatura onaylanirken hata olustu')})
							
							doc.save((err44,doc2)=>{
								taskHelper.setError(taskDoc,err,cb)
							})
						}else{
							taskHelper.setError(taskDoc,err,cb)
						}
					}else{
						taskHelper.setError(taskDoc,err,cb)
					}
				})
			}
		})
	}else{
		taskHelper.setCancelled(taskDoc,cb)
	}
}

function einvoice_decline(dbModel,taskDoc,cb){
	if(!taskDoc['document']){
		return taskHelper.setCancelled(taskDoc,cb)
	}
	if(taskDoc['document']['eIntegrator'] && dbModel){
		services.eInvoice.declineInvoice(dbModel,taskDoc['document'],(err)=>{
			if(!err){
				//dbModel.e_invoices.updateOne({_id:taskDoc.documentId} , {$set:{invoiceStatus:'Processing',invoiceErrors:[],'uuid.value':yeniUUID}},(err2)=>{
					taskHelper.setCompleted(taskDoc,cb)
				//})
			}else{
				dbModel.e_invoices.findOne({_id:taskDoc.documentId},(err33,doc)=>{
					if(!err33){
						if(doc!=null){
							doc.invoiceErrors.push({code:(err.name || err.code || 'DECLINE_INVOICE'),message:(err.message || 'Fatura reddedilirken hata olustu')})
							//doc.invoiceStatus='Error'
							
							doc.save((err44,doc2)=>{
								taskHelper.setError(taskDoc,err,cb)
							})
						}else{
							taskHelper.setError(taskDoc,err,cb)
						}
					}else{
						taskHelper.setError(taskDoc,err,cb)
					}
				})
			}
		})
	}else{
		taskHelper.setCancelled(taskDoc,cb)
	}
}

function einvoice_send_to_gib(dbModel,taskDoc,cb){
	console.log('einvoice_send_to_gib calisti')
	if(!taskDoc['document']){
		console.log('einvoice_send_to_gib taskHelper.setCancelled(taskDoc,cb)')
		return taskHelper.setCancelled(taskDoc,cb)
	}
	if(taskDoc['document']['eIntegrator'] && dbModel){
		var yeniUUID=uuid.v4()
		taskDoc['document'].uuid.value=yeniUUID
		services.eInvoice.sendToGib(dbModel,taskDoc['document'],(err)=>{
			if(!err){
				dbModel.e_invoices.updateOne({_id:taskDoc.documentId} , {$set:{invoiceStatus:'Processing',invoiceErrors:[],'uuid.value':yeniUUID}},(err2)=>{
					taskHelper.setCompleted(taskDoc,cb)
				})
			}else{
				dbModel.e_invoices.findOne({_id:taskDoc.documentId},(err33,doc)=>{
					if(!err33){
						if(doc!=null){
							doc.invoiceErrors.push({code:(err.name || err.code || 'SEND_TO_GIB'),message:(err.message || 'Gib e gonderimde hata olustu')})
							doc.invoiceStatus='Error'
							doc.uuid.value=yeniUUID
							doc.save((err44,doc2)=>{
								taskHelper.setError(taskDoc,err,cb)
							})
						}else{
							taskHelper.setError(taskDoc,err,cb)
						}
					}else{
						taskHelper.setError(taskDoc,err,cb)
					}
				})
			}
		})
	}else{
		console.log('document.eIntegrator :' ,taskDoc['document']['eIntegrator'])
		console.log('einvoice_send_to_gib 2 taskHelper.setCancelled(taskDoc,cb)')
		taskHelper.setCancelled(taskDoc,cb)
	}
}

function connector_transfer_zreport(dbModel,taskDoc,cb){
	try{
		taskHelper.setRunning(taskDoc,(err)=>{
			if(!err){

				connector_transfer_zreport_calistir(dbModel,taskDoc,cb)

			}else{
				taskHelper.setError(taskDoc,err,cb)
			}
		})
	}catch(tryErr){
		taskHelper.setError(taskDoc,err,cb)
	}
}


function connector_transfer_zreport_calistir(dbModel,taskDoc,cb){
	if(!taskDoc['document']){
		return taskHelper.setCancelled(taskDoc,cb)
	}
	if(taskDoc['document']['data'] && taskDoc['document']['posDevice'] && dbModel){
		var populate=[
		{path:'posDevice', populate:[
		{path:'location',select:'_id locationName'},
		{path:'service',select:'_id name serviceType'},
		{path:'localConnector',
		populate:['startFile','files']
	}

	]}
	]

	dbModel.pos_device_zreports.findOne({_id:taskDoc.documentId}).populate(populate).exec((err,zreportDoc)=>{
		if(!err){
			eventLog('Cihaz seri No:',zreportDoc.posDevice.deviceSerialNo)
			eventLog('Lokasyon:',zreportDoc.posDevice.location.locationName)
			eventLog('Yazar kasa servisi:',zreportDoc.posDevice.service.serviceType)
			eventLog('Local connectorId:',zreportDoc.posDevice.localConnector.connectorId)


			services.tr216LocalConnector.run(zreportDoc.posDevice.localConnector,zreportDoc,(err,result)=>{
				if(!err){

					dbModel.pos_device_zreports.updateOne({_id:taskDoc.documentId} , {$set:{status:'transferred',error:null}},(err2)=>{
						taskHelper.setCompleted(taskDoc,cb)

					})
				}else{
					if(err.code=='NOT_CONNECTED'){

						if(taskDoc.attemptCount<0){
							taskDoc.error=[result.error]
							taskHelper.setPending(taskDoc,cb)
						}else{

							dbModel.pos_device_zreports.updateOne({_id:taskDoc.documentId} , {$set:{status:'error',error:err}},(err2)=>{

								taskHelper.setError(taskDoc,err,cb)

							})
						}
					}else{

						dbModel.pos_device_zreports.updateOne({_id:taskDoc.documentId} , {$set:{status:'error',error:err}},(err2)=>{

							taskHelper.setError(taskDoc,err,cb)

						})

					}
				}
			})

		}else{
			taskHelper.setError(taskDoc,err,cb)
		}
	})
}else{
	taskHelper.setCancelled(taskDoc,cb)
}

}





function connector_import_einvoice(dbModel,taskDoc,cb){
	
	taskHelper.setRunning(taskDoc,(err)=>{
		if(!err){
			connector_import_einvoice_calistir(dbModel,taskDoc,(err)=>{
				if(cb) cb(err)
			})

		}else{
			taskHelper.setError(taskDoc,err)
			cb(err)
		}
	})
	
}

function connector_import_einvoice_calistir(dbModel,taskDoc,cb){
	if(!taskDoc['document']){
		return taskHelper.setCancelled(taskDoc,cb)
	}
	if(taskDoc['document']['localConnectorExportInvoice']['localConnector'] && dbModel){
		var populate=[
		{path:'localConnectorExportInvoice.localConnector',
		populate:['startFile','files']
	}
	]

	dbModel.e_integrators.findOne({_id:taskDoc.documentId}).populate(populate).exec((err,eIntegratorDoc)=>{
		if(!err){
			eventLog('eIntegrator:',eIntegratorDoc.eIntegrator)
			eventLog('name:',eIntegratorDoc.name)
			eventLog('Local connectorId:',eIntegratorDoc.localConnectorExportInvoice.localConnector.connectorId)
			services.tr216LocalConnector.run(eIntegratorDoc.localConnectorExportInvoice.localConnector,eIntegratorDoc,(err,result)=>{
				if(!err){
					documentHelper.insertEInvoice(dbModel,eIntegratorDoc,result.data,(err,docs)=>{
						if(!err){
							dbModel.e_integrators.updateOne({_id:taskDoc.documentId} , {$set:{'localConnectorExportInvoice.status':'transferred','localConnectorExportInvoice.error':null}},(err)=>{
								taskHelper.setCompleted(taskDoc,cb)
							})
						}else{
							dbModel.e_integrators.updateOne({_id:taskDoc.documentId} , {$set:{'localConnectorExportInvoice.status':'error','localConnectorExportInvoice.error':err}},(err2)=>{

								taskHelper.setError(taskDoc,err,cb)

							})
						}
					})

				}else{
					if(err.code=='NOT_CONNECTED'){

						if(taskDoc.attemptCount<=10){
							taskDoc.error=[result.error]
							taskHelper.setPending(taskDoc,cb)
						}else{

							dbModel.e_integrators.updateOne({_id:taskDoc.documentId} , {$set:{'localConnectorExportInvoice.status':'error', 'localConnectorExportInvoice.error':err}},(err2)=>{
								taskHelper.setError(taskDoc,err,cb)
							})
						}
					}else{

						dbModel.e_integrators.updateOne({_id:taskDoc.documentId} , {$set:{'localConnectorExportInvoice.status':'error','localConnectorExportInvoice.error':err}},(err2)=>{
							taskHelper.setError(taskDoc,err,cb)
						})

					}
				}
			})

		}else{
			taskHelper.setError(taskDoc,err,cb)
		}
	})
}else{
	taskHelper.setCancelled(taskDoc,cb)
}
}

