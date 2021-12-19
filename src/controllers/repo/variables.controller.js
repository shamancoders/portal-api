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
		error.method(req, next)
		break
		case 'PUT':
		put(dbModel, member, req, res, next, cb)
		break
		case 'DELETE':
		error.method(req, next)
		break
		default:
		error.method(req, next)
		break
	}
}

function getList(dbModel, member, req, res, next, cb){
	let options={page: (req.query.page || 1)}
	if(!req.query.page){
		options.limit=50000
	}
	let filter = {}

	if((req.query.name || req.query.parameter || '')!='')
		filter['parameter']={ $regex: '.*' + (req.query.name || req.query.parameter) + '.*' ,$options: 'i' }

	if((req.query.desc || req.query.description || '')!='')
		filter['description']={ $regex: '.*' + (req.query.desc || req.query.description) + '.*' ,$options: 'i' }

	dbModel.variables.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			cb(resp)
		}
	})
}

function getOne(dbModel, member, req, res, next, cb){
	dbModel.variables.findOne({_id:req.params.param1},(err,doc)=>{
		if(dberr(err,next)){
			cb(doc)
		}
	})
}


function put(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)
	let data=req.body || {}
	data._id = req.params.param1
	data.modifiedDate = new Date()

	dbModel.variables.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				let doc2 = Object.assign(doc, data)
				let newDoc = new dbModel.variables(doc2)
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

