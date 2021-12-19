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

		if(req.params.param1=='test'){
			test(dbModel, member, req, res, next, cb)
		}else{
			if(req.params.param2=='file'){

				saveFile(dbModel, member, req, res, next, cb)
			}else if(req.params.param2=='run'){

				runCode(dbModel, member, req, res, next, cb)
			}else if(req.params.param2=='setstart' || req.params.param2=='setStart'){
				setStart(dbModel, member, req, res, next, cb)
			}else{
				post(dbModel, member, req, res, next, cb)
			}
		}
		break
		case 'PUT':
		if(req.params.param2=='file'){
			saveFile(dbModel, member, req, res, next, cb)
		}else if(req.params.param2=='run'){
			runCode(dbModel, member, req, res, next, cb)
		}else if(req.params.param2=='setstart' || req.params.param2=='setStart'){
			setStart(dbModel, member, req, res, next, cb)
		}else{
			put(dbModel, member, req, res, next, cb)
		}
		break
		case 'DELETE':
		if(req.params.param2=='file'){
			deleteFile(dbModel, member, req, res, next, cb)
		}else{
			deleteItem(dbModel, member, req, res, next, cb)
		}

		break
		default:
		error.method(req, next)
		break
	}

}

function getList(dbModel, member, req, res, next, cb){
	let options={page: (req.query.page || 1)}
	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit

	let filter = {}

	if((req.query.importerType || '')!='')
		filter['importerType']=req.query.importerType

	dbModel.file_importers.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getOne(dbModel, member, req, res, next, cb){
	let populate=[{path:'files',select:'_id name extension fileName type size createdDate modifiedDate'}]
	let fileId=req.query.fileId || req.query.fileid || ''

	dbModel.file_importers.findOne({_id:req.params.param1}).populate(populate).exec((err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				if(doc.startFile!=undefined){
					doc=doc.toObject()
					doc.files.forEach((e)=>{
						if(e._id==doc.startFile.toString()){
							e['isStart']=true
						}else{
							e['isStart']=false
						}

					})
				}
				if(fileId!=''){
					let bFound=false
					doc.files.forEach((e)=>{
						if(e._id==fileId){
							bFound=true
							return
						}
					})
					if(!bFound){
						cb({success: false,error: {code: 'FILE_NOT_FOUND', message: 'Dosya bulunamadi'}})
					}else{
						dbModel.files.findOne({_id:fileId},(err,fileDoc)=>{
							if(dberr(err,next)){

								if(fileDoc){
									doc.files.forEach((e)=>{
										if(e._id==fileId){
											e['data']=fileDoc.data
											return
										}
									})
								}
								cb(doc)
							}
						})
					}
				}else{
					cb(doc)
				}
			}
		}
	})
}

function post(dbModel, member, req, res, next, cb){
	let data = req.body || {}
	data._id=undefined

	let newDoc = new dbModel.file_importers(data)
	if(!epValidateSync(newDoc,next))
		return

	newDoc.save((err, newDoc2)=>{
		if(dberr(err,next)){
			cb(newDoc2)
		}
	})
}


function put(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined){
		cb({success: false,error: {code: 'WRONG_PARAMETER', message: 'Para metre hatali'}})
	}else{
		let data = req.body || {}

		data._id = req.params.param1
		data.modifiedDate = new Date()


		dbModel.file_importers.findOne({ _id: data._id},(err,doc)=>{
			if(dberr(err,next)){
				if(dbnull(doc,next)){
					let doc2 = Object.assign(doc, data)
					let newDoc = new dbModel.file_importers(doc2)
					if(!epValidateSync(newDoc,next))
					return

					newDoc.save((err, newDoc2)=>{
						if(dberr(err,next))
							cb(newDoc2)
					})
				}
			}
		})
	}
}

function deleteItem(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)

	let data = req.body || {}
	data._id = req.params.param1
	dbModel.file_importers.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next))
			cb(null)
	})
}


function saveFile(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	if(req.params.param2==undefined)
		return error.param2(req,next)
	let data = req.body || {}
	let populate=[{path:'files',select:'_id name extension size type fileName '}]

	if(req.body._id!=undefined){
		data['_id']=req.body._id
	}else{
		data['_id']=req.query.fileId || req.query.fileid
	}


	dbModel.file_importers.findOne({ _id: req.params.param1}).populate(populate).exec((err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				if(data._id==undefined){

					let newfileDoc = new dbModel.files(data)
					epValidateSync(newfileDoc)

					newfileDoc.save((err, newfileDoc2)=>{
						if(dberr(err,next)){
							doc.files.push(newfileDoc2._id)
							doc.modifiedDate=new Date()
							doc.save((err)=>{
								if(dberr(err,next))
									cb('')
							})
						}
					})
				}else{
					let bFound=false
					doc.files.forEach((f)=>{
						if(f._id != undefined){
							if(f.name==data['name'] && f.extension==data['extension'] && f._id != data._id){
								bFound=true
								return
							}
						}
					})
					if(bFound)
						return next({code: 'ALREADY_EXISTS', message: 'Ayni dosya isminden baska bir kayit daha var!'})

					dbModel.files.findOne({_id:data._id},(err,fileDoc)=>{
						if(dberr(err,next)){
							if(dbnull(fileDoc)){
								fileDoc.name=data.name
								fileDoc.extension=data.extension
								fileDoc.data=data.data
								fileDoc.type=data.type
								fileDoc.size=data.size

								epValidateSync(fileDoc)
								if(dberr(err,next)){
									fileDoc.save((err)=>{
										if(dberr(err,next)){
											doc.modifiedDate=new Date()
											doc.save((err)=>{
												if(dberr(err,next))
													cb('')
											})
										}
									})
								}
							}
						}
					})
				}
			}
		}
	})
}

function setStart(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	if(req.params.param2==undefined || (req.query.fileId || req.query.fileid || '') == '')
		return error.param2(req,next)

	let fileId=req.query.fileId || req.query.fileid || ''
	dbModel.file_importers.findOne({ _id: req.params.param1,files:{$elemMatch:{$eq:fileId}}},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				doc.files.forEach((e,index)=>{
					if(e==req.query.fileId){
						doc.startFile=e._id
						return
					}
				})
				doc.save((err,doc2)=>{
					if(dberr(err,next)){
						cb('')
					}
				})

			}
		}
	})
}

function deleteFile(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	if(req.params.param2==undefined || (req.query.fileId || req.query.fileid || '') == '')
		return error.param2(req,next)

	let fileId=req.query.fileId || req.query.fileid || ''
	dbModel.file_importers.findOne({ _id: req.params.param1,files:{$elemMatch:{$eq:fileId}}},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				doc.files.forEach((e,index)=>{
					if(e==req.query.fileId){
						doc.files.splice(index,1)
						return
					}
				})
				doc.save((err,doc2)=>{
					if(dberr(err,next)){
						dbModel.files.removeOne(member,{ _id: req.query.fileId },(err)=>{
							if(dberr(err,next))
								cb(doc2)
						})
					}
				})
			}
		}
	})
}

function runCode(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	if(req.params.param2==undefined)
		return error.param2(req,next)

	let data = req.body || {}
	let populate=['startFile','files']
	dbModel.file_importers.findOne({_id:req.params.param1}).populate(populate).exec((err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				let sampleData={}
				if(data.sampleData!=undefined)
					sampleData=data.sampleData
				services.tr216LocalConnector.run(doc,sampleData,(err,resp)=>{
					if(dberr(err,next))
						cb(resp || '')
				})
			}
		}
	})
}