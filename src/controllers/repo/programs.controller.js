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
		}else if(req.params.param1=='render'){
			render(dbModel, member, req, res, next, cb)
		}else if(req.params.param1=='runCode'){
			runCode(dbModel, member, req, res, next, cb)
		}else if(req.params.param1=='run'){
			run(dbModel, member, req, res, next, cb)
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

function getIdList(dbModel, member, req, res, next, cb){
	
	var filter = {}
	var idList=req.params.param1.replaceAll(';',',').split(',')

	filter['_id']={$in:idList}

	dbModel.programs.find(filter,(err, docs)=>{
		if(dberr(err,next)){
			cb(docs)
		}
	})
}

function run(dbModel, member, req, res, next, cb){
	var id=req.params.param2 || req.body['id'] || req.query.id || ''
	var data=req.body || {}
	dbModel.programs.findOne({_id:id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				
				programs.run(dbModel,doc,data,(err,result)=>{
					if(!err){
						cb(result)
					}else{
						next(err)
					}
				})
			}
		}
	})
}

function render(dbModel, member, req, res, next, cb){
	var doc=req.body || {}
	if(!doc.files)
		return error.data(req,next,'files')
	if(doc.data==undefined){
		doc.data={}
	}

	util.renderFiles(doc.files,doc.data,(err,rendered)=>{
		if(!err){
			cb(rendered)
		}else{
			next(err)
		}
	})
}

function runCode(dbModel, member, req, res, next, cb){
	var doc=req.body || {}
	if(!doc.files)
		return error.data(req,next,'files')
	
	var data=doc.data || {}

	programs.run(dbModel,doc,data,(err,result)=>{
		if(!err){
			cb(result)
		}else{
			next(err)
		}
	})
}

function copy(dbModel, member, req, res, next, cb){
	var id=req.params.param2 || req.body['id'] || req.query.id || ''
	var newName=req.body['newName'] || req.body['name'] || ''

	if(id=='')
		return error.param2(req,next)

	dbModel.programs.findOne({ _id: id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				var data=doc.toJSON()
				data._id=undefined
				delete data._id
				if(newName!=''){
					data.name=newName
				}else{
					data.name +=' copy'
				}
				data.createdDate=new Date()
				data.modifiedDate=new Date()
				var newDoc = new dbModel.programs(data)
				if(!epValidateSync(newDoc,next))
					return
				newDoc.save((err, newDoc2)=>{
					if(dberr(err,next)){
						var obj=newDoc2.toJSON()
						obj['newName']=data.name
						cb(obj)
					} 
				})
			}
		}
	})
}


function getList(dbModel, member, req, res, next, cb){
	var options={page: (req.query.page || 1), 
		select:'-files'
	}

	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit
	

	var filter = {}

	if((req.query.passive || '')!='')
		filter['passive']=req.query.passive

	if((req.query.name || '')!='')
		filter['name']={ $regex: '.*' + req.query.name + '.*' ,$options: 'i' }
	
	
	dbModel.programs.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getOne(dbModel, member, req, res, next, cb){
	dbModel.programs.findOne({_id:req.params.param1},(err,doc)=>{
		if(dberr(err,next)){
			cb(doc)
		}
	})
}

function post(dbModel, member, req, res, next, cb){
	var data = req.body || {}
	data._id=undefined
	data=fazlaliklariTemizleDuzelt(data)
	
	var newDoc = new dbModel.programs(data)
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
	data=fazlaliklariTemizleDuzelt(data)
	
	dbModel.programs.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				var doc2 = Object.assign(doc, data)
				var newDoc = new dbModel.programs(doc2)
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


function fazlaliklariTemizleDuzelt(data){
	return data
}

function deleteItem(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	var data = req.body || {}
	data._id = req.params.param1
	dbModel.programs.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
}
