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
		}else if(req.params.param1=='run' || req.params.param1=='send'){
			send(dbModel, member, req, res, next, cb)
		}else{
				post(dbModel, member, req, res, next, cb)
		}
		break
		case 'PUT':
			put(dbModel, member, req, res, next, cb)
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
	var options={page: (req.query.page || 1)}
	if((req.query.pageSize || req.query.limit))
		options['limit']=req.query.pageSize || req.query.limit


	var filter = {}
	if((req.query.connectorType || '')!='')
		filter['connectorType']=req.query.connectorType

	dbModel.local_connectors.paginate(filter,options,(err, resp)=>{
		if(dberr(err,next)){
			var orList=[]
			var filter={}
			resp.docs.forEach((item)=>{
				orList.push({connectorId:item.connectorId,connectorPass:item.connectorPass})
			})
			
			if(orList.length>0)
				filter['$or']=orList

			db.local_connectors.find(filter,(err,docs)=>{
				if(dberr(err,next)){
					resp.docs.forEach((item)=>{
						var connectedItem= docs.find((e)=>{return (item.connectorId==e.connectorId && item.connectorPass==e.connectorPass)})
						if(connectedItem!=undefined){
							item['status']='offline'
							item['lastOnline']=connectedItem.lastOnline
							if((new Date()-connectedItem.lastOnline)/1000<120){
								item['status']='online'
							}
						}else{
							item['status']='error'
							item['lastOnline']=null
						}
					})
					cb(resp)
				}
			})

		}
	})
}

function getOne(dbModel, member, req, res, next, cb){
	var populate=[{path:'files',select:'_id name extension fileName type size createdDate modifiedDate'}]
	var fileId=req.query.fileId || req.query.fileid || ''

	dbModel.local_connectors.findOne({_id:req.params.param1}).populate(populate).exec((err,doc)=>{
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
					var bFound=false
					doc.files.forEach((e)=>{
						if(e._id==fileId){
							bFound=true
							return
						}
					})
					if(!bFound)
						return next({code: 'FILE_NOT_FOUND', message: 'Dosya bulunamadi'})

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
				}else{
					cb(doc)
				}
			}
		} 
	})
}

function post(dbModel, member, req, res, next, cb){
	var data = req.body || {}
	data._id=undefined

	var newDoc = new dbModel.local_connectors(data)
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

	dbModel.local_connectors.findOne({ _id: data._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				var doc2 = Object.assign(doc, data)
				var newDoc = new dbModel.local_connectors(doc2)
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

function deleteItem(dbModel, member, req, res, next, cb){
	if(req.params.param1==undefined)
		return error.param1(req, next)

	var data = req.body || {}
	data._id = req.params.param1
	dbModel.local_connectors.removeOne(member,{ _id: data._id},(err,doc)=>{
		if(dberr(err,next))
			cb(null)
	})
}


function send(dbModel, member, req, res, next, cb){

	var data = req.body || {}
	if(data['connectorId']==undefined || data['connectorPass']==undefined || data['connectionType']==undefined)
		return next({code:'WRONG_PARAMETER',message:'connectorId, connectorPass, connectionType are required.'})

	if(data.connection){
		if(data.connection.port){
			if(!isNaN(data.connection.port)){
				data.connection.port=Number(data.connection.port)
			}
		}
	}
	

	restServices.connector.post(dbModel,`/send`,data,(err,data)=>{
		if(dberr(err,next)){
			cb(data)
		}
	})
}


function test(dbModel, member, req, res, next, cb){
	var data = req.body || {}


	if(data['connectorId']==undefined || data['connectorPass']==undefined || data['connectionType']==undefined)
		return next({code:'WRONG_PARAMETER',message:'connectorId, connectorPass, connectionType are required.'})
	if(data.connection){
		if(data.connection.port){
			if(!isNaN(data.connection.port)){
				data.connection.port=Number(data.connection.port)
			}
		}
	}
	console.log(`data:`,data)
	tempLog('local_connectors.send.json',JSON.stringify(data,null,2))

	switch(data.connectionType){
		case 'mssql':
			data['command']='MSSQL_CONNECTION_TEST'
		break
		case 'mysql':
			data['command']='MYSQL_CONNECTION_TEST'
		break
		default:
			data['command']='TIME'
		break
	}
	restServices.connector.post(dbModel,`/test`,data,(err,data)=>{
		if(dberr(err,next)){
			cb(data)
		}
	})

}