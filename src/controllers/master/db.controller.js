module.exports = function(member, req, res, next, cb) {
	
	if(req.params.param1=='resonance'){
		switch(req.params.param2){
			case 'test':
			resonance_test(member, req, res, next, cb)
			break
			case 'mssqltest':
			resonance_mssqltest(member, req, res, next, cb)
			break

			case 'mssqlquery':
			resonance_mssql(member, req, res, next, cb)
			break

			case 'mysqlquery':
			resonance_mysql(member, req, res, next, cb)
			break

			default:
			next({code:'UNKNOWN_DB_COMMAND',message:'Unknown database command'})
			break
		}
	}else{
		error.param1(req,next)
	}
	
}


function resonance_test(member, req, res, next, cb){
	var resonanceId=req.body.resonanceId || req.query.resonanceId || ''
	var resonancePassword =req.body.resonancePassword || req.body.password || req.query.resonancePassword || req.query.password || ''
	resonanceId = resonanceId.replaceAll(' ','').replaceAll('.','')
	
	db.resonanceIds.findOne({resonanceId:resonanceId,resonancePassword:resonancePassword},(err,doc)=>{
		if(dberr(err, next)){
			if(dbnull(doc, next)){
				services.tr216LocalConnector.sendCommand({id:doc.resonanceId,password:doc.resonancePassword,uuid:doc.resonanceUuid},"TIME","",(result)=>{
					cb(result.data)
				})
			}
		}
	})
}

function resonance_mssqltest(member, req, res, next, cb){
	var resonanceId=req.body.resonanceOptions.resonanceId || ''
	var resonancePassword =req.body.resonanceOptions.password || ''
	resonanceId = resonanceId.toString().replaceAll(' ','').replaceAll('.','')
	var server=req.body.resonanceOptions.mssql.server  || ''
	var database=req.body.resonanceOptions.mssql.database || ''
	var user=req.body.resonanceOptions.mssql.user || ''
	var password=req.body.resonanceOptions.mssql.password || ''
	var port=req.body.resonanceOptions.mssql.port || 1433
	
	db.resonanceIds.findOne({resonanceId:resonanceId,resonancePassword:resonancePassword},function(err,doc){
		if(dberr(err, next))
			if(dbnull(doc, next)){
				var params={connection:{user:user,password:password,server:server,database:database,port:port}}
				services.tr216LocalConnector.sendCommand({id:doc.resonanceId,password:doc.resonancePassword,uuid:doc.resonanceUuid},"MSSQL_CONNECTION_TEST",params,(result)=>{
					if(result.success){
						cb(result.data)
					}else{
						next(result.error)
					}
				})
			}
		})
}

function resonance_mysqltest(member, req, res, next, cb){
	var resonanceId=req.body.resonanceOptions.resonanceId || ''
	var resonancePassword =req.body.resonanceOptions.password || ''
	resonanceId = resonanceId.toString().replaceAll(' ','').replaceAll('.','')
	var server=req.body.resonanceOptions.mysql.server  || ''
	var database=req.body.resonanceOptions.mysql.database || ''
	var user=req.body.resonanceOptions.mysql.user || ''
	var password=req.body.resonanceOptions.mysql.password || ''
	var port=req.body.resonanceOptions.mysql.port || 3306

	db.resonanceIds.findOne({resonanceId:resonanceId,resonancePassword:resonancePassword},(err,doc)=>{
		if(dberr(err, next))
			if(dbnull(doc, next)){
				var params={connection:{user:user,password:password,server:server,database:database,port:port}}
				services.tr216LocalConnector.sendCommand({id:doc.resonanceId,password:doc.resonancePassword,uuid:doc.resonanceUuid},"MYSQL_CONNECTION_TEST",params,(result)=>{
					if(result.success){
						cb(result.data)
					}else{
						next(result.error)
					}
				})
			}
		})   


}

function resonance_mssql(member, req, res, next, cb){
	var dbId=req.body._id || req.body.dbId || ''
	var dbName=req.body.dbName || req.body.dbName || ''
	var query=req.body.query  || ''
	var filter={}
	if(dbId!=''){
		filter={owner:member._id, _id:dbId}
	}else{
		filter={owner:member._id, dbName:dbName}
	}
	if(query.trim()=='')
		return next({code:"QUERY_EMPTY",message:"Sql sorgu bos olamaz."})
	

	db.dbdefines.findOne(filter,(err,doc)=>{
		if(dberr(err, next))
			if(dbnull(doc, next)){
				db.resonanceIds.findOne({resonanceId:doc.resonanceOptions.resonanceId,resonancePassword:doc.resonanceOptions.password},(err,resonanceDoc)=>{
					if(dberr(err, next))
						if(dbnull(resonanceDoc,cb)){
							var params={query:query, connection:{user:doc.resonanceOptions.mssql.user,password:doc.resonanceOptions.mssql.password,server:doc.resonanceOptions.mssql.server,database:doc.resonanceOptions.mssql.database,port:doc.resonanceOptions.mssql.port}}
							services.tr216LocalConnector.sendCommand({id:resonanceDoc.resonanceId,password:resonanceDoc.resonancePassword,uuid:resonanceDoc.uuid},"MSSQL_QUERY",params,(result)=>{
								if(result.success){
									cb(result.data)
								}else{
									next(result.error)
								}
							})
						}
					})   
			}
		})
}


function resonance_mysql(member, req, res, next, cb){
	var dbId=req.body._id || req.body.dbId || ''
	var dbName=req.body.dbName || req.body.dbName || ''
	var query=req.body.query  || ''
	var filter={}
	if(dbId!=''){
		filter={owner:member._id, _id:dbId}
	}else{
		filter={owner:member._id, dbName:dbName}
	}
	if(query.trim()==''){
		cb({success:false,error:{code:"QUERY_EMPTY",message:"Sql sorgu bos olamaz."}})
		return
	}

	db.dbdefines.findOne(filter,function(err,doc){
		if(dberr(err, next)){
			if(dbnull(doc, next)){
				db.resonanceIds.findOne({resonanceId:doc.resonanceOptions.resonanceId,resonancePassword:doc.resonanceOptions.password},function(err,resonanceDoc){
					if(dberr(err, next)){
						if(dbnull(resonanceDoc,cb)){
							var params={query:query, connection:{user:doc.resonanceOptions.mysql.user,password:doc.resonanceOptions.mysql.password,server:doc.resonanceOptions.mysql.server,database:doc.resonanceOptions.mysql.database,port:doc.resonanceOptions.mysql.port}}
							services.tr216LocalConnector.sendCommand({id:resonanceDoc.resonanceId,password:resonanceDoc.resonancePassword,uuid:resonanceDoc.uuid},"MYSQL_QUERY",params,(result)=>{
								if(result.success){
									cb(result.data)
								}else{
									next(result.error)
								}
							})
						}
					}
				})   
			}
		}
	})
}
