module.exports = (dbModel, member, req, res, next, cb)=>{
	switch(req.method){
		case 'GET':
		if(req.params.param1!=undefined){
			getOne(dbModel, member, req, res, next, cb)
		}else{
			exports.getList(dbModel, member, req, res, next, cb)
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

exports.getList=function(dbModel, member, req, res, next, cb){
	
	let options={page: (req.query.page || 1)}
	if(!req.query.page){
		options.limit=50000
	}
	options.populate=[
		{
			path:'programButtons.program',
			select:'_id name type passive'
		},
		{
			path:'print.form',
			select:'_id name module isDefault passive'
		},
		{
			path:'print.list',
			select:'_id name module isDefault passive'
		}
	]
		


	let filter = {}

	if((req.query.module || '')!='')
		filter['module']=req.query.module

	dbModel.settings.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getOne(dbModel, member, req, res, next, cb){
	dbModel.settings.findOne({_id:req.params.param1},(err,doc)=>{
		if(dberr(err,next)){
			cb(doc)
		}
	})
}

function post(dbModel, member, req, res, next, cb){
	let data = req.body || {}
	data._id=undefined
	data=dataDuzenle(data,req)
	let newDoc = new dbModel.settings(data)
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
	let data=req.body || {}
	data._id = req.params.param1
	data.modifiedDate = new Date()
	data=dataDuzenle(data,req)
	dbModel.settings.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				let doc2 = Object.assign(doc, data)
				let newDoc = new dbModel.settings(doc2)
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

function dataDuzenle(data,req){

	if(data.print){
		if((data.print.form || '')=='')
			data.print.form=undefined
		if((data.print.list || '')=='')
			data.print.list=undefined
	}

	

	return data
}

function deleteItem(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	let data = req.body || {}
	data._id = req.params.param1
	dbModel.settings.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			cb(null)
		}
	})
}
