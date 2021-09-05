module.exports = (member, req, res, next, cb)=>{
	if(!member){
		return error.auth(req,next)
	}
	switch(req.method){
		case 'GET':
		if(req.params.param1!=undefined){
			if(req.params.param1.indexOf(',')>-1 || req.params.param1.indexOf(';')>-1){
				getIdList(member, req, res, next, cb)
			}else{
				getOne(member, req, res, next, cb)
			}
		}else{
			getList(member, req, res, next, cb)
		}
		break
		case 'POST':
		if(req.params.param1=='copy'){
			copy(member, req, res, next, cb)
		}else{
			post(member, req, res, next, cb)
		}

		break
		case 'PUT':
		put(member, req, res, next, cb)
		break
		case 'DELETE':
		deleteItem(member, req, res, next, cb)
		break
		default:
		error.method(req, next)
		break
	}
}


function copy(member, req, res, next, cb){
	let id=req.params.param2 || req.body['id'] || req.query.id || ''
	let newName=req.body['newName'] || req.body['name'] || ''

	if(id=='')
		error.param2(req,next)

	dbWeb.items.findOne({ _id: id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				let data=doc.toJSON()
				data._id=undefined
				delete data._id
				if(newName!=''){
					data.title=newName
				}else{
					data.title +=' copy'
				}
				data.createdDate=new Date()
				data.modifiedDate=new Date()

				let newDoc = new dbWeb.items(data)
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

function getList(member, req, res, next, cb){
	let options={page: (req.query.page || 1), limit:10,
		populate:[
		{path:'image',select:'_id large'}
		]
	}
	
	if((req.query.pageSize || req.query.limit))
		options.limit=req.query.pageSize || req.query.limit
	if(options.limit>50){
		options.limit=50
	}
	let filter = {memberId:member._id}
	options.sort={}

	if((req.query.imageSize || '')!=''){
		switch(req.query.imageSize){
			case 'small':
			case 'sm':
			options.populate[0].select='_id small'
			break
			case 'medium':
			case 'md':
			options.populate[0].select='_id medium'
			break
			case 'large':
			case 'lg':
			options.populate[0].select='_id large'
			break
			case 'original':
			options.populate[0].select='_id data'
			break
		}
	}

	if((req.query.passive || '')!='*'){
		if((req.query.passive || '')!=''){
			filter.passive=req.query.passive
		}else{
			filter.passive=false
		}
	}

	if((req.query.category || '')!='')
		filter['category']=req.query.category

	if((req.query.title || '')!='')
		filter.title={ $regex: '.*' + req.query.title + '.*' ,$options: 'i' }

	if((req.query.description || '')!='')
		filter.description={ $regex: '.*' + req.query.description + '.*' ,$options: 'i' }

	if((req.query.search || '').trim()!=''){
		filter['$or']=[
		{title:{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }},
		{description:{ $regex: '.*' + req.query.search + '.*' ,$options: 'i' }}
		]
	}

	dbWeb.items.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getIdList(member, req, res, next, cb){
	
	let filter = {memberId:member._id}
	let populate=[
	{path:'images', select:'_id data'}
	]
	let idList=req.params.param1.replaceAll(';',',').split(',')

	filter['_id']={$in:idList}

	dbWeb.items.find(filter).populate(populate).exec((err, docs)=>{
		if(dberr(err,next)){
			cb(docs)
		}
	})
}


function getOne(member, req, res, next, cb){

	let filter = {memberId:member._id,_id:req.params.param1}
	let populate=[
	{path:'images', select:'_id data'}
	]
	dbWeb.items.findOne(filter).populate(populate).exec((err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				cb(doc)
			}
		}
	})
}

function post(member, req, res, next, cb){
	let data = req.body || {}
	data._id=undefined

	data.memberId=member._id
	data=dataDuzenle(data,req)

	saveImages(member,data,(err,data)=>{
		if(dberr(err,next)){
			dbWeb.items.save(member,data,(err,newDoc2)=>{
				if(dberr(err,next)){
					cb(newDoc2)
				} 
			})
		}
	})
}



function saveImages (member,data,cb){
	if(!data.images){
		return cb(null,data)
	}
	let resimler=data.images
	if(!Array.isArray(resimler)){
		resimler=[resimler]
	}


	let imageList=[]
	let index=0


	function calistir(cb1){
		if(index>=resimler.length)
			return cb1()

		if(resimler[index]._id){
			dbWeb.images.findOne({_id:resimler[index]._id, uploadById:member._id},(err,doc)=>{
				if(dberr(err,cb1)){
					if(dbnull(doc,cb1)){
						doc.caption=resimler[index].caption || doc.caption || ''
						doc.tags=resimler[index].tags || doc.tags || ''
						doc.blur=resimler[index].blur!=undefined?resimler[index].blur:doc.blur
						doc.adult=resimler[index].adult!=undefined?resimler[index].adult:doc.adult
						doc.passive=resimler[index].passive!=undefined?resimler[index].passive:doc.passive
						doc.rotate=resimler[index].rotate!=undefined?resimler[index].rotate:doc.rotate
						doc.zoom=resimler[index].zoom!=undefined?resimler[index].zoom:doc.zoom
						doc.marginTop=resimler[index].marginTop!=undefined?resimler[index].marginTop:doc.marginTop
						doc.marginLeft=resimler[index].marginLeft!=undefined?resimler[index].marginLeft:doc.marginLeft
						doc.save((err)=>{
							if(!err){
								imageList.push(doc._id)
								index++
								setTimeout(calistir,0,cb1)
							}else{
								cb1(err)
							}
						})
					}
				}
			})
		}else{
			let imgData={
				uploadById:member?member._id:null,
				caption:resimler[index].caption || '',
				tags:resimler[index].tags || '',
				fileName:resimler[index].fileName || '',
				width:resimler[index].width || 0,
				height:resimler[index].height || 0,
				data:resimler[index].data || '',
				small:resimler[index].small || '',
				medium:resimler[index].medium || '',
				large:resimler[index].large || '',
				blur:resimler[index].blur || false,
				adult:resimler[index].adult || false,
				passive:resimler[index].passive || false,
				rotate:resimler[index].rotate || 0,
				zoom:resimler[index].zoom || 0,
				marginTop:resimler[index].marginTop || 0,
				marginLeft:resimler[index].marginLeft || 0
			}
			let newDoc=new dbWeb.images(imgData)
			newDoc.save((err,newDoc2)=>{
				if(!err){
					imageList.push(newDoc2._id)
					index++
					setTimeout(calistir,0,cb1)
				}else{
					cb1(err)
				}
			})
		}
		
	}

	calistir((err)=>{
		if(!err){
			delete data.images

			data.images=imageList
			if(data.images.length>0){
				data.image=data.images[0]
			}else{
				data.image=null
				
			}
			cb(null,data)
		}else{
			cb(err)
		}
	})
}


function put(member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	let data=req.body || {}
	data._id = req.params.param1
	data.modifiedDate = new Date()
	data=dataDuzenle(data,req)

	dbWeb.items.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				saveImages(member,data,(err,data)=>{

					let doc2 = Object.assign(doc, data)
					console.log(`doc2._id:`,doc2._id)
					dbWeb.items.save(member,doc2,(err,newDoc2)=>{
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
	let schemaKeys=Object.keys(dbWeb.items.schema.obj)
	if(data.params==undefined){
		data.params={}
	}
	Object.keys(data).forEach((key)=>{
		if(!schemaKeys.includes(key)){
			data.params[key]=data[key]
		}
	})


	return data
}

function deleteItem(member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	let data = req.body || {}
	data._id = req.params.param1
	dbWeb.items.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
}

