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
	var id=req.params.param2 || req.body['id'] || req.query.id || ''
	var newName=req.body['newName'] || req.body['name'] || ''

	if(id=='')
		return error.param1(req, next)

	dbModel.packing_types.findOne({ _id: id},(err,doc)=>{
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
				data.pack=[]
				data.location=undefined
				delete data.location
				data.subLocation=undefined
				delete data.subLocation

				data.createdDate=new Date()
				data.modifiedDate=new Date()
				var newDoc = new dbModel.packing_types(data)
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
		sort:{name:1}
	}
	if(!req.query.page){
		options.limit=50000
	}
	var filter = {}

	if((req.query.name || '')!=''){
		filter['$or']=[
		{name:{ $regex: '.*' + req.query.name + '.*' ,$options: 'i' }},
		{description:{ $regex: '.*' + req.query.name + '.*' ,$options: 'i' }}
		]
    }
    if((req.query.description || '')!='')
    	filter['description']={ $regex: '.*' + req.query.description + '.*' ,$options: 'i' }
    
    
    if((req.query.width || '')!='')
    	filter['width']=req.query.width
    

    if((req.query.length || '')!='')
    	filter['length']=req.query.length
    

    if((req.query.height || '')!='')
    	filter['height']=req.query.height
    

    if((req.query.maxWeight || '')!='')
    	filter['maxWeight']=req.query.maxWeight

    dbModel.packing_types.paginate(filter,options,(err, resp)=>{
    	if(dberr(err,next)){
    		cb(resp)
    	}
    })
}

function getOne(dbModel, member, req, res, next, cb){
	var populate=[
	{path:'content.item', select:'_id name unitPacks tracking passive'}
        // {path:'docLine.color', select:'_id name'}, //qwerty
        // {path:'docLine.pattern', select:'_id name'}, //qwerty
        // {path:'docLine.size', select:'_id name'} //qwerty
        ]
        dbModel.packing_types.findOne({_id:req.params.param1}).populate(populate).exec((err,doc)=>{
        	if (!err) {
        		cb(doc)
        	} else {
        		cb({success: false, error: {code: err.name, message: err.message}})
        	}
        })
    }

    function post(dbModel, member, req, res, next, cb){
    	var data = req.body || {}
    	data._id=undefined
    	
    	var newDoc = new dbModel.packing_types(data)
    	if(!epValidateSync(newDoc,next))
		return

    	newDoc.save((err, newDoc2)=>{
    		if (!err) {
    			cb(newDoc2)
    		} else {
    			cb({success: false, error: {code: err.name, message: err.message}})
    		}
    	})
    }

    function put(dbModel, member, req, res, next, cb){
    	if(req.params.param1==undefined)
    		return error.param1(req, next)
    	var data=req.body || {}
    	data._id = req.params.param1
    	data.modifiedDate = new Date()

    	dbModel.packing_types.findOne({ _id: data._id},(err,doc)=>{
    		if (!err) {
    			if(doc==null){
    				cb({success: false,error: {code: 'RECORD_NOT_FOUND', message: 'Kayit bulunamadi'}})
    			}else{
    				var doc2 = Object.assign(doc, data)
    				var newDoc = new dbModel.packing_types(doc2)
    				if(!epValidateSync(newDoc,next))
					return
    				
    				newDoc.save((err, newDoc2)=>{
    					if (!err) {
    						cb(newDoc2)
    					} else {
    						cb({success: false, error: {code: err.name, message: err.message}})
    					}
    				})
    			}
    		}else{
    			cb({success: false, error: {code: err.name, message: err.message}})
    		}
    	})
    }

    function deleteItem(dbModel, member, req, res, next, cb){
    	if(req.params.param1==undefined){
    		cb({success: false,error: {code: 'WRONG_PARAMETER', message: 'Parametre hatali'}})
    	}else{
    		var data = req.body || {}
    		data._id = req.params.param1
    		dbModel.packing_types.removeOne(member,{ _id: data._id},(err,doc)=>{
    			if (!err) {
    				cb(null)
    			}else{
    				cb({success: false, error: {code: err.name, message: err.message}})
    			}
    		})
    	}
    }
