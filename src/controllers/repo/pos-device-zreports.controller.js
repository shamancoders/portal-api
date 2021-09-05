module.exports = (dbModel, member, req, res, next, cb)=>{
	switch(req.method){
		case 'GET':
		if(req.params.param1!=undefined){
			if(req.params.param1=='rapor1'){
				rapor1(dbModel, member, req, res, next, cb)
			}else if(req.params.param1=='rapor2'){
				rapor2(dbModel, member, req, res, next, cb)
			}else{
				getOne(dbModel, member, req, res, next, cb)
			}

		}else{
			getList(dbModel, member, req, res, next, cb)
		}
		break
		case 'POST':
		if(req.params.param1=='transfer'){
			transfer(dbModel, member, req, res, next, cb)
		}else if(req.params.param1=='rollback'){
			rollback(dbModel, member, req, res, next, cb)
		}else if(req.params.param1=='settransferred'){
			setTransferred(dbModel, member, req, res, next, cb)
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


function getList(dbModel, member, req, res, next, cb){
	var options={page: Number(req.query.page || 1)
		,limit:10
	}
	if((req.query.pageSize || req.query.limit)){
		options.limit=req.query.pageSize || req.query.limit
	}

	var filter = {}

	options.sort={
		zDate:1
	}

	options.populate={
		path:'posDevice',
		select:'_id location service deviceSerialNo deviceModel',
		populate:[
		{path:'location',select:'_id name'},
		{path:'service',select:'_id name type'}
		]
	}

	if(req.query.zNo || req.query.ZNo || req.query.zno){
		filter['zNo']=req.query.zNo || req.query.ZNo || req.query.zno
	}else{
		filter['zNo']={$gte:0}
	}

	if(req.query.zTotal || req.query.ztotal)
		filter['zTotal']=Number((req.query.zTotal || req.query.ztotal))

	if(req.query.status=='transferred'){
		filter['status']='transferred'
	}else if(req.query.status=='error'){
		filter['status']='error'
	}else if(req.query.status=='waiting'){
		filter['status']={$nin:['transferred']}
	}else {
		
	}


	if((req.query.date1 || '')!='')
		filter['zDate']={$gte:(new Date(req.query.date1))}

	if((req.query.date2 || '')!=''){
		if(filter['zDate']){
			filter['zDate']['$lte']=(new Date(req.query.date2))
		}else{
			filter['zDate']={$lte:(new Date(req.query.date2))}
		}
	}

	filter_deviceSerialNo(dbModel,req,filter,(err,filter)=>{
		if(dberr(err,next)){
			filter_location(dbModel,req,filter,(err,filter)=>{
				if(dberr(err,next)){
					dbModel.pos_device_zreports.paginate(filter,options,(err,resp)=>{
						if(dberr(err,next)){
							
							resp.docs.forEach((e)=>{
								if(e.zDate){
									e.zDate=e.zDate.yyyymmdd()
								}else{
									e.zDate=''
								}
								if(e.data){
									var str=`ZNo:${e.data.ZNo}, Tarih:${e.data.ZDate.substr(0,10)} ${e.data.ZTime} , Toplam:${e.data.GunlukToplamTutar} Kdv:${e.data.GunlukToplamKDV}`
									e.data=str
								}else{
									e.data=''
								}
								
								
							})
							cb(resp)
						}
					})
				}
			})
		}
	})
}


function rapor1(dbModel, member, req, res, next, cb){
	var options={page: (req.query.page || 1)
	}
	if((req.query.pageSize || req.query.limit))
		options.limit=req.query.pageSize || req.query.limit
	

	var filter = {}

	if(req.query.date1)
		filter['zDate']={$gte:(new Date(req.query.date1))}

	if(req.query.date2){
		if(filter['zDate']){
			filter['zDate']['$lte']=(new Date(req.query.date2+ 'T23:59:59+0300'))
		}else{
			filter['zDate']={$lte:(new Date(req.query.date2+ 'T23:59:59+0300'))}
		}
	}

	var aggregateGroup={ 
		$group: {
			_id:'$posDevice',
			posDevice:{$first:'$posDevice'},
			startZNo:{$first:'$zNo'},
			endZNo:{$last:'$zNo'},
			GunlukToplamTutar: { $sum: '$data.GunlukToplamTutar' },
			GunlukToplamKDV: { $sum: '$data.GunlukToplamKDV' },
			MaliFisAdedi: { $sum: '$data.MaliFisAdedi' },
			NakitTutari: { $sum: '$data.NakitTutari' },
			KrediTutari: { $sum: '$data.KrediTutari' },
			FoodSaleCnt: { $sum: '$data.FoodSaleCnt' },
			FoodRcptTotalAmount: { $sum: '$data.FoodRcptTotalAmount' },
			InvoiceTotal: { $sum: '$data.InvoiceTotal' },
			EInvoiceTotal: { $sum: '$data.EInvoiceTotal' },
			EArchiveInvoiceTotal: { $sum: '$data.EArchiveInvoiceTotal' },
			BankaTransferTutari: { $sum: '$data.BankaTransferTutari' },
			TaxRate0Amount: { $sum: '$data.TaxRate0Amount' },
			TaxRate1Amount: { $sum: '$data.TaxRate1Amount' },
			TaxRate8Amount: { $sum: '$data.TaxRate8Amount' },
			TaxRate18Amount: { $sum: '$data.TaxRate18Amount' },
			FaturaliSatisTutari: { $sum: '$data.FaturaliSatisTutari' },
			count: { $sum: 1 }
		}
	}

	filter_deviceSerialNo(dbModel,req,filter,(err,filter)=>{
		if(dberr(err,next)){
			filter_location(dbModel,req,filter,(err,filter)=>{
				if(dberr(err,next)){
					var aggregate=[]
					if(filter!={}){
						aggregate=[{$match:filter},aggregateGroup]
					}else{
						aggregate=[aggregateGroup]
					}
					var myAggregate = dbModel.pos_device_zreports.aggregate(aggregate)
					dbModel.pos_device_zreports.aggregatePaginate(myAggregate,options,(err, resp)=>{
						if(dberr(err,next)){
							if(resp.docs.length==0){
								return cb(resp)
							}
							var populate={
								path:'posDevice',
								select:'_id location service deviceSerialNo deviceModel',
								populate:[
								{path:'location',select:'_id name'}
								]
							}

							dbModel.pos_device_zreports.populate(resp.docs,populate,(err,docs)=>{
								if(dberr(err,next)){
									resp.docs=docs
									cb(resp)
								}
							})
						}
					})
				}
			})
		}
	})
}

function rapor2(dbModel, member, req, res, next, cb){
	var options={page: (req.query.page || 1)}

	if((req.query.pageSize || req.query.limit)){
		options.limit=req.query.pageSize || req.query.limit
	}

	var filter = {}

	if(req.query.date1)
		filter['zDate']={$gte:(new Date(req.query.date1))}

	if(req.query.date2){
		if(filter['zDate']){
			filter['zDate']['$lte']=(new Date(req.query.date2))
		}else{
			filter['zDate']={$lte:(new Date(req.query.date2))}
		}
	}

	filter_location(dbModel,req,filter,(err,filter)=>{
		if(dberr(err,next)){
			var aggregate=[
			{
				$match:filter
			},
			{
				$lookup: {
					from: 'pos_devices',
					localField: 'posDevice',
					foreignField: '_id',
					as: 'posDevice'
				}
			},
			{ 
				$unwind:"$posDevice"
			},

			{  
				$group: {
					_id:'$posDevice.location',
					location:{$first:'$posDevice.location'},
					GunlukToplamTutar: { $sum: '$data.GunlukToplamTutar' },
					GunlukToplamKDV: { $sum: '$data.GunlukToplamKDV' },
					MaliFisAdedi: { $sum: '$data.MaliFisAdedi' },
					NakitTutari: { $sum: '$data.NakitTutari' },
					KrediTutari: { $sum: '$data.KrediTutari' },
					FoodSaleCnt: { $sum: '$data.FoodSaleCnt' },
					FoodRcptTotalAmount: { $sum: '$data.FoodRcptTotalAmount' },
					InvoiceTotal: { $sum: '$data.InvoiceTotal' },
					EInvoiceTotal: { $sum: '$data.EInvoiceTotal' },
					EArchiveInvoiceTotal: { $sum: '$data.EArchiveInvoiceTotal' },
					BankaTransferTutari: { $sum: '$data.BankaTransferTutari' },
					TaxRate0Amount: { $sum: '$data.TaxRate0Amount' },
					TaxRate1Amount: { $sum: '$data.TaxRate1Amount' },
					TaxRate8Amount: { $sum: '$data.TaxRate8Amount' },
					TaxRate18Amount: { $sum: '$data.TaxRate18Amount' },
					FaturaliSatisTutari: { $sum: '$data.FaturaliSatisTutari' },
					count: { $sum: 1 }
				}
			}
			]

			

			dbModel.pos_device_zreports.aggregate(aggregate,(err,docs)=>{
				if(dberr(err,next)){
					var resp={
						docs:docs,
						page:1,
						pageSize:50000,
						pageCount:1,
						recordCount:docs.length
					}
					if(resp.docs.length==0){
						return cb(resp)
					}
					var populate={
						path:'location',
						model: 'locations',
						select:'_id name'
					}
					
					dbModel.pos_device_zreports.populate(resp.docs,populate,(err,docs)=>{
						if(dberr(err,next)){
							resp.docs=docs
							
							cb(resp)
						}
					})
				}
			})
			
		}
	})
}


function filter_deviceSerialNo(dbModel,req,filter,cb){
	if(req.query.deviceSerialNo || req.query['posDevice.deviceSerialNo']){
		dbModel.pos_devices.find({ deviceSerialNo:{$regex: '.*' + (req.query.deviceSerialNo || req.query['posDevice.deviceSerialNo']) + '.*' ,$options: 'i' }},(err,posDeviceDocs)=>{
			if(!err){
				filter['$or']=[]
				posDeviceDocs.forEach((e)=>{
					filter['$or'].push({posDevice:e._id})
				})
				cb(null,filter)
			}else{
				cb(err,filter)
			}
		})
	}else{
		cb(null,filter)
	}
}

function filter_location(dbModel,req,filter,cb){
	if((req.query.location || req.query['posDevice.location'] || req.query['posDevice.location._id']) ){
		dbModel.pos_devices.find({ location: (req.query.location || req.query['posDevice.location'] ||  req.query['posDevice.location._id']) },(err,posDeviceDocs)=>{
			if(!err){
				if(filter['$or']!=undefined){
					var newOR=[]
					filter['$or'].forEach((e)=>{
						var bfound= false
						posDeviceDocs.forEach((e2)=>{ 
							if(e['posDevice'].toString()==e2._id.toString()){
								bfound=true
								return
							}
						})
						if(bfound){
							newOR.push(e)
						}
					})
					filter['$or']=newOR
				}else{
					filter['$or']=[]
					posDeviceDocs.forEach((e)=>{
						filter['$or'].push({posDevice:e._id})
					})
				}

				cb(null,filter)
			}else{
				cb(err,filter)
			}
		})
	}else{
		cb(null,filter)
	}
}

function getOne(dbModel, member, req, res, next, cb){
	var populate={
		path:'posDevice',
		select:'_id location service deviceSerialNo deviceModel',
		populate:[
		{path:'location',select:'_id name'},
		{path:'service',select:'_id name type'},
		{path:'localConnector',select:'_id name'}
		]
	}
	dbModel.pos_device_zreports.findOne({_id:req.params.param1}).populate(populate).exec((err,doc)=>{
		if(dberr(err,next)){
			cb(doc)
		}
	})
}


function post(dbModel, member, req, res, next, cb){
	var data = req.body || {}
	data._id=undefined

	var newDoc = new dbModel.pos_device_zreports(data)
	if(!epValidateSync(newDoc,next))
		return
	newDoc.save((err, newDoc2)=>{
		if(dberr(err,next)){
			cb(newDoc2)
		}
	})
}

function put(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	var data = req.body || {}
	data._id = req.params.param1
	data.modifiedDate = new Date()

	dbModel.pos_device_zreports.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				var doc2 = Object.assign(doc, data)
				var newDoc = new dbModel.pos_device_zreports(doc2)
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

function deleteItem(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	var data = req.body || {}
	data._id = req.params.param1
	dbModel.pos_device_zreports.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
}

function transfer(dbModel, member, req, res, next, cb){
	var data = req.body || {}
	if(data.list==undefined)
		return next({code: 'ERROR', message: 'list is required.'})

	var populate={
		path:'posDevice',
		select:'_id location service deviceSerialNo deviceModel',
		populate:['location','service','localConnector']
	}
	var idList=[]
	data.list.forEach((e)=>{
		if(e && typeof e === 'object' && e.constructor === Object){
			if(e._id!=undefined){
				idList.push(e._id)
			}else if(e.id!=undefined){
				idList.push(e.id)
			}else{
				return next({code: 'ERROR', message: 'list is wrong.'})
			}
		}else{
			idList.push(e)
		}
	})
	var filter={status:{$nin:['transferred','pending']},_id:{$in:idList}}
	dbModel.pos_device_zreports.find(filter).populate(populate).exec((err,docs)=>{
		if(dberr(err,next)){
			var index=0
			function pushTask(cb){
				if(index>=docs.length){
					cb(null)
				}else{
					var taskdata={taskType:'connector_transfer_zreport',collectionName:'pos_device_zreports',documentId:docs[index]._id,document:docs[index]}
					taskHelper.newTask(dbModel,taskdata,(err,taskDoc)=>{
						if(!err){
							switch(taskDoc.status){
								case 'running':
								docs[index].status='transferring'
								break
								case 'pending':
								docs[index].status='pending'
								break
								case 'completed':
								docs[index].status='transferred'
								break
								case 'error':
								docs[index].status='error'
								break
								default:
								docs[index].status=''
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
					cb({success: true,data:resp})
				}
			})
		}
	})
}


function rollback(dbModel, member, req, res, next, cb){
	var data = req.body || {}
	if(data.list==undefined)
		return next({code: 'ERROR', message: 'list is required.'})

	var idList=[]
	data.list.forEach((e)=>{
		if(e && typeof e === 'object' && e.constructor === Object){
			if(e._id!=undefined){
				idList.push(e._id)
			}else if(e.id!=undefined){
				idList.push(e.id)
			}else{
				return cb({success: false, error: {code: 'ERROR', message: 'rollbackList is wrong.'}})
			}
		}else{
			idList.push(e)
		}
	})
	var filter={status:{$ne:''},_id:{$in:idList}}
	dbModel.pos_device_zreports.updateMany(filter,{$set:{status:''}},{multi:true},(err,resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})


}

function setTransferred(dbModel, member, req, res, next, cb){
	var data = req.body || {}
	if(data.list==undefined)
		return next({code: 'ERROR', message: 'list is required.'})

	var idList=[]
	data.list.forEach((e)=>{
		if(e && typeof e === 'object' && e.constructor === Object){
			if(e._id!=undefined){
				idList.push(e._id)
			}else if(e.id!=undefined){
				idList.push(e.id)
			}else{
				return next({code: 'ERROR', message: 'rollbackList is wrong.'})
			}
		}else{
			idList.push(e)
		}
	})
	var filter={status:{$ne:'transferred'},_id:{$in:idList}}
	dbModel.pos_device_zreports.updateMany(filter,{$set:{status:'transferred'}},{multi:true},(err,resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}


function zreportDataToString(serviceType,data){

	switch(serviceType){
		case 'ingenico':
		return 'ZNo:' + data.ZNo + ', Tarih:' + data.ZDate.substr(0,10) + ' ' + data.ZTime + ', Toplam:' + data.GunlukToplamTutar.formatMoney(2,',','.') + ', T.Kdv:' + data.GunlukToplamKDV.formatMoney(2,',','.')
		// return ingenico.zreportDataToString(data)
		default:
		return 'ZREPORT DETAIL...'
	}
}