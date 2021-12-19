module.exports = (dbModel, member, req, res, next, cb)=>{
	switch(req.method){
		case 'GET':
		if(req.params.param1!=undefined){
			if(req.params.param1.indexOf(',')>-1 || req.params.param1.indexOf(';')>-1){
				getIdList(dbModel, member, req, res, next, cb)
			}else{
				getOne(dbModel, member, req, res, next, cb)
			}
			
		}else{
			getList(dbModel, member, req, res, next, cb)
		}
		break
		case 'POST':
		if(req.params.param1=='copy'){
			copy(dbModel, member, req, res, next, cb)
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

function copy(dbModel, member, req, res, next, cb){
	let id=req.params.param2 || req.body['id'] || req.query.id || ''
	let newName=req.body['newName'] || req.body['name'] || ''

	if(id=='')
		error.param2(req,next)

	dbModel.items.findOne({ _id: id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				let data=doc.toJSON()
				data._id=undefined
				delete data._id
				if(newName!=''){
					data.name.value=newName
				}else{
					data.name.value +=' copy'
				}
				data.createdDate=new Date()
				data.modifiedDate=new Date()

				let newDoc = new dbModel.items(data)
				if(!epValidateSync(newDoc,next))
					return
				newDoc.save((err, newDoc2)=>{
					if(dberr(err,next)){
						receteleriKaydet(dbModel,doc,newDoc2,(err,newDoc3)=>{
							if(!err){
								let obj=newDoc3.toJSON()
								obj['newName']=data.name.value
								cb(obj)
							}else{
								dbModel.items.deleteOne({_id:newDoc2._id},(err2)=>{
									return dberr(err,next)
								})
							}
						})

					} 
				})
			}
		}
	})
}

function receteleriKaydet(dbModel,itemDoc,newItemDoc,cb){
	dbModel.recipes.find({item:itemDoc._id},(err,docs)=>{
		if(!err){
			if(docs.length==0) 
				return cb(null,newItemDoc)

			let index=0

			function kaydet(cb){
				if(index>=docs.length) return cb(null)
					let data=docs[index].toJSON()
				data._id=undefined
				delete data._id
				data['item']=newItemDoc._id
				let yeniReceteDoc=new dbModel.recipes(data)
				yeniReceteDoc.save((err,yeniReceteDoc2)=>{
					if(!err){
						if(itemDoc.recipe==docs[index]._id){
							newItemDoc.recipe=yeniReceteDoc2._id
						}
						index++
						setTimeout(kaydet,0,cb)
					}else{
						cb(err)
					}
				})
			}

			kaydet((err)=>{
				if(!err){
					newItemDoc.save((err,newItemDoc2)=>{
						cb(err,newItemDoc2)
					})
				}else{
					cb(err)
				}

			})

		}else{
			cb(err)
		}
	})
}

function getList(dbModel, member, req, res, next, cb){
	let options={page: (req.query.page || 1)
		
	}
	
	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit
	
	let filter = {}
	options.sort={
		'name.value':1
	}

	if(req.query.itemType!='all'){
		if((req.query.itemType || req.query.itemtype || req.query.type || '')!=''){
			filter['itemType']=(req.query.itemType || req.query.itemtype || req.query.type)
		}else{
			filter['itemType']='item'
		}
	}


	if((req.query.passive || '')!='')
		filter['passive']=req.query.passive


	if((req.query.name || req.query['name.value'] || '')!='')
		filter['name.value']={ $regex: '.*' + (req.query.name || req.query['name.value']) + '.*' ,$options: 'i' }

	if((req.query.description  || req.query['description.value'] || '')!='')
		filter['description.value']={ $regex: '.*' + (req.query.description  || req.query['description.value']) + '.*' ,$options: 'i' }


	if((req.query.brandName || req.query['brandName.value'] || '')!='')
		filter['brandName.value']={ $regex: '.*' + (req.query.brandName || req.query['brandName.value']) + '.*' ,$options: 'i' }



	if((req.query.keyword || req.query['keyword.value'] || '')!='')
		filter['keyword.value']={ $regex: '.*' + (req.query.keyword || req.query['keyword.value']) + '.*' ,$options: 'i' }

	if((req.query.modelName || req.query['modelName.value'] || '')!='')
		filter['modelName.value']={ $regex: '.*' + (req.query.modelName || req.query['modelName.value']) + '.*' ,$options: 'i' }

	if((req.query.search || '').trim()!=''){
		filter['$or']=[
		{'name.value':{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }},
		{'description.value':{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }},
		{'brandName.value':{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }},
		{'keyword.value':{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }},
		{'modelName.value':{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }}
		]
	}
	if((req.query.itemClassificationCode || req.query['itemClassificationCode.value'] || '')!='')
		filter['commodityClassification.itemClassificationCode.value']={ $regex: '.*' + (req.query.itemClassificationCode || req.query['itemClassificationCode.value']) + '.*' ,$options: 'i' }

	if((req.query.unitCode || '')!='')
		filter['unitCode']=req.query.unitCode
	if((req.query.unitCode2 || '')!='')
		filter['unitCode2']=req.query.unitCode2
	if((req.query.unitCode3 || '')!='')
		filter['unitCode3']=req.query.unitCode3

	if((req.query.accountGroup || '')!='')
		filter['accountGroup']=req.query.accountGroup

	if((req.query.lotNo || req.query['tracking.lotNo'] || '')!='')
		filter['tracking.lotNo']=req.query.lotNo || req.query['tracking.lotNo']

	if((req.query.serialNo || req.query['tracking.serialNo'] || '')!='')
		filter['tracking.serialNo']=req.query.serialNo || req.query['tracking.serialNo']

	if((req.query.color || req.query['tracking.color'] || '')!='')
		filter['tracking.color']=req.query.color || req.query['tracking.color']

	if((req.query.pattern || req.query['tracking.pattern'] || '')!='')
		filter['tracking.pattern']=req.query.pattern || req.query['tracking.pattern']

	if((req.query.size || req.query['tracking.size'] || '')!='')
		filter['tracking.size']=req.query.size || req.query['tracking.size']

	dbModel.items.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getIdList(dbModel, member, req, res, next, cb){
	
	let filter = {}
	let idList=req.params.param1.replaceAll(';',',').split(',')

	filter['_id']={$in:idList}

	dbModel.items.find(filter,(err, docs)=>{
		if(dberr(err,next)){
			cb(docs)
		}
	})
}


function getOne(dbModel, member, req, res, next, cb){
	let populate=[
	{path:'images',select:'_id name extension fileName data type size createdDate modifiedDate'},
	{path:'files',select:'_id name extension fileName data type size createdDate modifiedDate'},
	{path:'packingOptions.packingType',select:'_id name description width length height weight maxWeight'},
	{path:'packingOptions.packingType2',select:'_id name description width length height weight maxWeight'},
	{path:'packingOptions.packingType3',select:'_id name description width length height weight maxWeight'},
	{path:'packingOptions.palletType',select:'_id name description width length height maxWeight'}
	]
	dbModel.items.findOne({_id:req.params.param1}).populate(populate).exec((err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				if(!req.query.print){

					cb(doc)
				}else{
					let moduleType='item'
					if(doc.itemType=='product' || doc.itemType=='semi-product')
						moduleType='item-product'

					printHelper.print(dbModel,moduleType,doc,(err,html)=>{
						if(!err){
							cb({file: {data:html}})
						}else{
							next({code:(err.code || err.name || 'PRINT_ERROR'),message:err.message})
						}
					})
				}
			}
		}
	})
}

function post(dbModel, member, req, res, next, cb){
	let data = req.body || {}
	data._id=undefined

	data=dataDuzenle(data,req)

	saveFiles(dbModel,data,(err,data)=>{
		let newDoc = new dbModel.items(data)
		if(!epValidateSync(newDoc,next))
			return
		newDoc.save((err, newDoc2)=>{
			if(dberr(err,next)){
				cb(newDoc2)
			} 
		})
	})
}

function put(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	let data=req.body || {}
	data._id = req.params.param1
	data.modifiedDate = new Date()
	data=dataDuzenle(data,req)

	dbModel.items.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				saveFiles(dbModel,data,(err,data)=>{
					let doc2 = Object.assign(doc, data)
					let newDoc = new dbModel.items(doc2)
					if(!epValidateSync(newDoc,next))
						return

					newDoc.save((err, newDoc2)=>{
						if(dberr(err,next)){
							cb(newDoc2)
						} 
					})
				})
			}
		}
	})
}

function dataDuzenle(data,req){
	if((data.accountGroup || '')=='')
		data.accountGroup=undefined

	if(!Array.isArray(data.unitPacks)){
		if(typeof data.unitPacks!='object'){
			data.unitPacks=[]
		}
	}

	if(!Array.isArray(data.vendors)){
		if(typeof data.vendors!='object'){
			data.vendors=[]
		}
	}

	if((req.query.itemType || '')!=''){
		data['itemType']=req.query.itemType
	}

	return data
}

function deleteItem(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	let data = req.body || {}
	data._id = req.params.param1
	dbModel.items.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
}


function saveFiles(dbModel,data,cb){
	dosyaKaydet(dbModel,data.images,(err,array1)=>{
		data.images=array1
		dosyaKaydet(dbModel,data.files,(err,array2)=>{
			data.files=array2
			cb(null,data)
		})
	})
}

function dosyaKaydet(dbModel,files,cb){
	if(files==undefined)
		return cb(null,[])
	if(files.length==0)
		return cb(null,[])

	let dizi=[]
	let index=0
	function kaydet(cb){
		if(index>=files.length)
			return cb(null)
		let data={ 
			data:files[index].data,
			fileName:(files[index].fileName || ''),
			name:(files[index].name || ''),
			extension:(files[index].extension || ''),
			type:(files[index].type || 'text/plain')
		}
		if(data.fileName=='' && data.name==''){
			index++
			setTimeout(kaydet,0,cb)
			return
		}
		if((files[index]._id || '')!=''){
			dbModel.files.findOne({_id:files[index]._id},(err,doc)=>{
				if(!err){
					if(doc!=null){
						doc.data=data.data
						doc.fileName=data.fileName
						doc.name=data.name
						doc.extension=data.extension
						doc.type=data.type
						doc.save((err,doc2)=>{
							if(!err){
								dizi.push(doc2._id)
							}else{
								errorLog(err)
							}
							index++
							setTimeout(kaydet,0,cb)
						})
					}else{
						let newFile=new dbModel.files(data)
						newFile.save((err,doc2)=>{
							if(!err){
								dizi.push(doc2._id)
							}else{
								errorLog(err)
							}
							index++
							setTimeout(kaydet,0,cb)
						})
					}
				}else{
					index++
					setTimeout(kaydet,0,cb)
				}
			})
		}else{
			let newFile=new dbModel.files(data)
			newFile.save((err,doc2)=>{
				if(!err){
					dizi.push(doc2._id)
				}else{
					errorLog(err)
				}
				index++
				setTimeout(kaydet,0,cb)
			})
		}
	}

	kaydet((err)=>{
		cb(null,dizi)
	})
}