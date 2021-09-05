module.exports = (dbModel, member, req, res, next, cb)=>{
	switch(req.method){
		case 'GET':
		if(req.params.param1!=undefined){
			if(req.params.param1.lcaseeng()=='salesorders'){
				salesOrders(dbModel, member, req, res, next, cb)
			}else{
				getOne(dbModel, member, req, res, next, cb)
			}

		}else{
			getList(dbModel, member, req, res, next, cb)
		}
		break
		case 'POST':
		if(req.params.param1!=undefined){
			if(req.params.param1=='approve'){
				approveDecline('Approved', dbModel, member, req, res, next, cb)
			}else if(req.params.param1=='decline'){
				approveDecline('Declined', dbModel, member, req, res, next, cb)
			}else if(req.params.param1=='start'){
				approveDecline('Processing', dbModel, member, req, res, next, cb)
			}else if(req.params.param1.toLowerCase()=='setdraft'){
				approveDecline('Draft', dbModel, member, req, res, next, cb)
			}else if(req.params.param1.toLowerCase()=='complete'){
				approveDecline('Completed', dbModel, member, req, res, next, cb)
			}else{
				cb({success: false,error: {code: 'WRONG_PARAMETER', message: 'Para metre hatali'}})
			}
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

function approveDecline(status, dbModel,member,req,res,next, cb){
	if(req.params.param2==undefined)
		return error.param2(req,next)
	var data = req.body || {}

	data._id = req.params.param2
	data.modifiedDate = new Date()
	dbModel.production_orders.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				doc.status=status
				doc.save((err, doc2)=>{
					if(dberr(err,next)){
						cb(doc2)
					}
				})
			}
		}
	})
}

function salesOrders(dbModel, member, req, res, next, cb){
	var options={page: (req.query.page || 1) ,

	}

	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit

	var aggregateProject=[
	{
		$unwind:'$orderLine'
	},
	{
		$project: {
			_id:'$orderLine._id',
			sip_id:'$_id',
			profileId:'$profileId',
			ioType:'$ioType',
			ID: '$ID',
			salesOrderId:'$salesOrderId',
			issueDate: '$issueDate',
			issueTime:'$issueTime',
			orderTypeCode: '$orderTypeCode',
			validityPeriod:1,
			lineCountNumeric:1,
			buyerCustomerParty: { party:'$buyerCustomerParty.party'},
			orderLine:1,
			deliveredRemaining:{$subtract:['$orderLine.orderedQuantity.value', '$orderLine.deliveredQuantity.value']},
			producedRemaining:{$subtract:['$orderLine.orderedQuantity.value', '$orderLine.producedQuantity.value']},
			localDocumentId: 1,
			orderStatus: 1,
			localStatus:1
		}
	},
	{
		$match: {
			ioType:0,
			deliveredRemaining:{$gt:0},
			producedRemaining:{$gt:0}
		}
	}]

	if((req.query.orderLineId || '')!=''){
		aggregateProject[2]['$match']['_id']={ $in: [ObjectId(req.query.orderLineId)]}
	}

	var myAggregate = dbModel.orders.aggregate(aggregateProject)

	dbModel.orders.aggregatePaginate(myAggregate,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getList(dbModel, member, req, res, next, cb){
	var options={page: (req.query.page || 1), 
		select:'-process',
		populate:[
		{path:'item',select:'_id name description'},
		{path:'sourceRecipe',select:'_id name description'}
		]
	}

	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit


	var filter = {}

	if((req.query.productionId || req.query.productionNo || req.query.no || '')!='')
		filter['productionId']={ '$regex': '.*' + (req.query.productionId || req.query.productionNo || req.query.no) + '.*' , '$options': 'i' }
	
	if((req.query.productionTypeCode || '')!='')
		filter['productionTypeCode']=req.query.productionTypeCode

	if((req.query.status || '')!='')
		filter['status']=req.query.status

	if((req.query.date1 || '')!='')
		filter['issueDate']={$gte:req.query.date1}

	if((req.query.date2 || '')!=''){
		if(filter['issueDate']){
			filter['issueDate']['$lte']=req.query.date2
		}else{
			filter['issueDate']={$lte:req.query.date2}
		}
	}

	if((req.query.musteri || req.query.customer || req.query.customerName || '')!='')
		filter['orderLineReference.orderReference.buyerCustomerParty.party.partyName.name.value']={ '$regex': '.*' + (req.query.musteri || req.query.customer || req.query.customerName) + '.*' , '$options': 'i' }

	applyOtherFilters(dbModel,req,filter,(err,filter2)=>{
		if(dberr(err,next)){
			dbModel.production_orders.paginate(filter2,options,(err, resp)=>{
				if(dberr(err,next)){
					cb(resp)
				}
			})
		}
	})
}

function applyOtherFilters(dbModel,req,mainFilter,cb){

	function filter_item(filter,cb){
		if((req.query.itemName || '')!='' || (req.query.item || req.query.itemId || '')!=''){
			var itemFilter={ 'name.value': { $regex: '.*' + req.query.itemName + '.*' ,$options: 'i' }}
			if((req.query.item || req.query.itemId || '')!=''){
				itemFilter={_id:(req.query.item || req.query.itemId)}
			}
			dbModel.items.find(itemFilter,(err,itemList)=>{
				if(!err){
					if(filter['$or']!=undefined){
						var newOR=[]
						filter['$or'].forEach((e)=>{
							var bfound= false
							fiches.forEach((e2)=>{ 
								if(e['item'].toString()==e2._id.toString()){
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
						itemList.forEach((e)=>{
							filter['$or'].push({item:e._id})
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

	filter_item(mainFilter,(err,mainFilter2)=>{
		cb(err,mainFilter2)
	})
}

function getOne(dbModel, member, req, res, next, cb){
	var populate=[
	{ path:'process.station', select:'_id name'},
	{ path:'process.step', select:'_id name useMaterial'},
	{ path:'process.machines.machine', select:'_id name'},
	{ path:'process.machines.mold', select:'_id name'},
	{ path:'process.input.item', select:'_id itemType name description'},
	{ path:'process.output.item', select:'_id itemType name description'},
	{ path:'materialSummary.item', select:'_id itemType name description'},
	{ path:'outputSummary.item', select:'_id itemType name description'},
	{ path:'packingOption.packingType',select:'_id name description width length height weight maxWeight'},
	{ path:'packingOption.packingType2',select:'_id name description width length height weight maxWeight'},
	{ path:'packingOption.packingType3',select:'_id name description width length height weight maxWeight'},
	{ path:'packingOption.palletType',select:'_id name description width length height maxWeight'}
	]

	dbModel.production_orders.findOne({_id:req.params.param1}).populate(populate).exec((err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				if(!req.query.print){
					var populate2=[
					{path:'docLine.item', select:'_id name description unitPacks tracking passive'},
					{path:'docLine.pallet', select:'_id name'}
					]
					// {path:'docLine.color', select:'_id name'}, //qwerty
                    // {path:'docLine.pattern', select:'_id name'}, //qwerty
                    // {path:'docLine.size', select:'_id name'} //qwerty

                    dbModel.inventory_fiches.find({productionOrderId:doc._id}).populate(populate2).exec((err,invFiches)=>{
                    	if(dberr(err,next)){
                    		doc=doc.toJSON()
                    		doc['inventory_fiches']=invFiches
                    		cb(doc)
                    	}
                    })
                }else{
                	doc.populate('item').execPopulate((err,doc2)=>{
                		if(dberr(err,next)){
                			var designId=req.query.designId || ''
                			printHelper.print(dbModel,'mrp-production-order',doc2, designId, (err,html)=>{
                				if(!err){
                					cb({file: {data:html}})
                				}else{
                					cb({success:false,error:{code:(err.code || err.name || 'PRINT_ERROR'),message:err.message}})
                				}
                			})
                		}
                	})
                }
            }
        }
    })
}

function post(dbModel, member, req, res, next, cb){
	var data = req.body || {}
	data._id=undefined
	verileriDuzenle(dbModel,data,(err,data)=>{
		documentHelper.yeniUretimNumarasi(dbModel,data,(err,data)=>{
			var newDoc = new dbModel.production_orders(data)
			if(!epValidateSync(newDoc,next))
		return

			newDoc=calculateMaterialSummary(newDoc)
			newDoc.save((err, newDoc2)=>{
				if(dberr(err,next)){
					var populate=[
					{ path:'process.station', select:'_id name'},
					{ path:'process.step', select:'_id name useMaterial'},
					{ path:'process.machines.machine', select:'_id name'},
					{ path:'process.machines.mold', select:'_id name'},
					{ path:'process.input.item', select:'_id itemType name description'},
					{ path:'process.output.item', select:'_id itemType name description'},
					{ path:'materialSummary.item', select:'_id itemType name description'},
					{ path:'outputSummary.item', select:'_id itemType name description'}
					]
					dbModel.production_orders.findOne({_id:newDoc2._id}).populate(populate).exec((err,newDoc3)=>{
						if(dberr(err,next)){
							cb(newDoc3)
						}
					})
				} 
			})
		})
	})
}

function put(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	var data = req.body || {}

	data._id = req.params.param1
	data.modifiedDate = new Date()
	verileriDuzenle(dbModel,data,(err,data)=>{
		dbModel.production_orders.findOne({ _id: data._id},(err,doc)=>{
			if(dberr(err,next)){
				if(dbnull(doc,next)){
					doc.orderLineReference=[]
					doc.process=[]
					var doc2 = Object.assign(doc, data)
					var newDoc = new dbModel.production_orders(doc2)
					if(!epValidateSync(newDoc,next))
					return

					newDoc=calculateMaterialSummary(newDoc)
					newDoc.save((err, newDoc2)=>{
						if(dberr(err,next)){
							var populate=[
							{ path:'process.station', select:'_id name'},
							{ path:'process.step', select:'_id name useMaterial'},
							{ path:'process.machines.machine', select:'_id name'},
							{ path:'process.machines.mold', select:'_id name'},
							{ path:'process.input.item', select:'_id itemType name description'},
							{ path:'process.output.item', select:'_id itemType name description'},
							{ path:'materialSummary.item', select:'_id itemType name description'},
							{ path:'outputSummary.item', select:'_id itemType name description'}
							]
							dbModel.production_orders.findOne({_id:newDoc2._id}).populate(populate).exec((err,newDoc3)=>{
								if(dberr(err,next)){
									cb(newDoc3)
								}
							})
						} 
					})

				}
			}
		})
	})
}

function calculateMaterialSummary(doc){
	doc.materialSummary=[]
	doc.outputSummary=[]
	doc.process.forEach((e)=>{
		e.input.forEach((e1)=>{
			var bFound=false
			doc.materialSummary.forEach((e2)=>{
				if(e2.item==e1.item){
					bFound=true
					e2.quantity +=e1.quantity
					return
				}
			})
			if(bFound==false){
				doc.materialSummary.push({item:e1.item,quantity:e1.quantity,unitCode:e1.unitCode})
			}
		})
		e.output.forEach((e1)=>{
			var bFound=false
			doc.outputSummary.forEach((e2)=>{
				if(e2.item==e1.item){
					bFound=true
					e2.quantity +=e1.quantity
					return
				}
			})
			if(bFound==false){
				doc.outputSummary.push({item:e1.item,quantity:e1.quantity,unitCode:e1.unitCode})
			}
		})
	})

	var toplamAgirlik=doc.totalWeight || 0

	if(toplamAgirlik>0){
		doc.materialSummary.forEach((e)=>{
			e.percent=Math.round(1000*100*e.quantity/toplamAgirlik)/1000
		})
		doc.outputSummary.forEach((e)=>{
			e.percent=Math.round(1000*100*e.quantity/toplamAgirlik)/1000
		})
	}

	return doc
}

function verileriDuzenle(dbModel,data,cb){
	if(!data.packingOption)
		return cb(null,data)
	if((data.packingOption.palletType || '')=='')
		data.packingOption.palletType=undefined
	if((data.packingOption.packingType || '')=='')
		data.packingOption.packingType=undefined
	if((data.packingOption.packingType2 || '')=='')
		data.packingOption.packingType2=undefined
	if((data.packingOption.packingType3 || '')=='')
		data.packingOption.packingType3=undefined
	if(data.process){
		data.process.forEach((p)=>{
			if(p.machines){
				p.machines.forEach((e)=>{
					if((e.machineGroup || '')==''){
						e.machineGroup=undefined
					}else{
						if((e.machineGroup._id || '')==''){
							e.machineGroup=undefined
						}
					}

					if((e.mold || '')==''){
						e.mold=undefined
					}else{
						if((e.mold._id || '')==''){
							e.mold=undefined
						}
					}
				})
			}
		})
	}
	cb(null,data)
}


function deleteItem(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	var data = req.body || {}
	data._id = req.params.param1
	dbModel.production_orders.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
}