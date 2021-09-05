module.exports = (dbModel, member, req, res, next, cb)=>{
	switch(req.method){
		case 'GET':
		if(req.params.param1!=undefined){
			getOne(dbModel, member, req, res, next, cb)
		}else{
			getList(dbModel, member, req, res, next, cb)
		}
		break
		case 'POST':
		post(dbModel, member, req, res, next, cb)
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
	var options={page: (req.query.page || 1)}
	if(!req.query.page){
		options.limit=50000
	}
	var filter = {}

	if((req.query.item || '')!='')
		filter['item']=req.query.item

	dbModel.recipes.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getOne(dbModel, member, req, res, next, cb){
	var populate=[
	{ path:'process.station', select:'_id name'},
	{ path:'process.step', select:'_id name useMaterial'},
	{ path:'process.machines.machineGroup', select:'_id name'},
	{ path:'process.machines.mold', select:'_id name'},
	{ path:'process.input.item', select:'_id itemType name description'},
	{ path:'process.output.item', select:'_id itemType name description'},
	{ path:'materialSummary.item', select:'_id itemType name description'},
	{ path:'outputSummary.item', select:'_id itemType name description'}
	]
	dbModel.recipes.findOne({_id:req.params.param1}).populate(populate).exec((err,doc)=>{
		if(dberr(err,next)){
			if(!req.query.print){
				cb(doc)
			}else{
				doc.populate('item').execPopulate((err,doc2)=>{
					if(dberr(err,next)){
						printHelper.print(dbModel,'recipe',doc2,(err,html)=>{
							if(dberr(err,next)){
								cb({file: {data:html}})
							}
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

	if((data.item || '')=='')
		return error.param1(req, next)
	dbModel.items.findOne({_id:data.item},(err,itemDoc)=>{
		if(dberr(err,next)){
			if(itemDoc==null)
				return next({code: 'ITEM_NOT_FOUND', message: 'item bulunamadi.'})

			
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

			var newDoc = new dbModel.recipes(data)

			if(!epValidateSync(newDoc,next))
				return

			newDoc=calculateMaterialSummary(newDoc)
			newDoc.save((err, newDoc2)=>{
				if(dberr(err,next)){
					defaultReceteAyarla(dbModel,newDoc2,(err,newDoc3)=>{
						var populate=[
						{ path:'process.station', select:'_id name'},
						{ path:'process.step', select:'_id name useMaterial'},
						{ path:'process.machines.machineGroup', select:'_id name'},
						{ path:'process.machines.mold', select:'_id name'},
						{ path:'process.input.item', select:'_id itemType name description'},
						{ path:'process.output.item', select:'_id itemType name description'},
						{ path:'materialSummary.item', select:'_id itemType name description'},
						{ path:'outputSummary.item', select:'_id itemType name description'}
						]
						dbModel.recipes.findOne({_id:newDoc3._id}).populate(populate).exec((err,doc)=>{
							if(dberr(err,next)){
								cb(doc)
							}
						})
					})
				} 
			})
		}
	})
}

function put(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	var data=req.body || {}
	data._id = req.params.param1
	data.modifiedDate = new Date()
	if((data.item || '')=='')
		return error.param1(req, next)

	dbModel.items.findOne({_id:data.item},(err,itemDoc)=>{
		if(dberr(err,next)){
			if(itemDoc==null)
				return next({code: 'ITEM_NOT_FOUND', message: 'item bulunamadi.'})
			dbModel.recipes.findOne({ _id: data._id},(err,doc)=>{
				if(dberr(err,next)){
					if(dbnull(doc,next)){
						if(data.process){
							if(data.process.machines){
								data.process.machines.forEach((e)=>{
									if((e.machineGroup || '')=='') e.machineGroup=undefined
										if((e.mold || '')=='') e.mold=undefined

									})
							}
						}
						doc.process=[]
						var doc2 = Object.assign(doc, data)
						var newDoc = new dbModel.recipes(doc2)
						if(!epValidateSync(newDoc,next))
							return

						newDoc=calculateMaterialSummary(newDoc)
						newDoc.save((err, newDoc2)=>{
							defaultReceteAyarla(dbModel,newDoc2,(err,newDoc3)=>{
								var populate=[
								{ path:'process.station', select:'_id name'},
								{ path:'process.step', select:'_id name useMaterial'},
								{ path:'process.machines.machineGroup', select:'_id name'},
								{ path:'process.machines.mold', select:'_id name'},
								{ path:'process.input.item', select:'_id itemType name description'},
								{ path:'process.output.item', select:'_id itemType name description'},
								{ path:'materialSummary.item', select:'_id itemType name description'},
								{ path:'outputSummary.item', select:'_id itemType name description'}
								]
								dbModel.recipes.findOne({_id:newDoc3._id}).populate(populate).exec((err,doc)=>{
									if(dberr(err,next)){
										cb(doc)
									}
								})
							})
						})
					}
				}
			})
		}
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

function defaultReceteAyarla(dbModel,doc,cb){

	if(doc.isDefault){
		dbModel.recipes.updateMany({item:doc.item,_id:{$ne:doc._id}},{$set:{isDefault:false}},{multi:true},(err,c)=>{
			cb(null,doc)
		})
	}else{
		dbModel.recipes.find({ item:doc.item, isDefault:true }).count((err,countQuery)=>{
			if(countQuery>0)
				return cb(null,doc)
			doc.isDefault=true
			doc.save((err,doc2)=>{
				if(!err){
					cb(null,doc2) 
				}else{
					cb(null,doc) 
				}
			})
		})
	}
}

function deleteItem(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	var data = req.body || {}
	data._id = req.params.param1
	dbModel.recipes.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			const countQuery = dbModel.recipes.where({ item:doc.item, isDefault:true }).countDocuments()
			if(countQuery>0)
				return cb(null)
			dbModel.recipes.updateOne({item:doc.item},{$set:{isDefault:true}},(err,c)=>{
				cb(null)
			})
		}
	})
}
