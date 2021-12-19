module.exports = (dbModel, member, req, res, next, cb)=>{
	switch(req.method){
		case 'GET':
		if(req.params.param1!=undefined){
			getOne(dbModel, member, req, res, next, cb)
		}else{
			getList(dbModel, member, req, res, next, cb)
		}
		break

		default:
		error.method(req, next)
		break
	}

}

function getList(dbModel, member, req, res, next, cb){
	let keys=[]
	console.log(`req.query.search :`,req.query.search )
	let forbiddens=['_id', 'name', 'conn', 'dbName', 'userDb', 'settings', 'recycle', 'actions','variables']
	Object.keys(dbModel).forEach((e)=>{
		bFound=false
		forbiddens.forEach((f)=>{
			if(f==e){
				bFound=true
				return 
			}
		})
		if(!bFound)
			if((req.query.search || req.query.name || '')==''){
				keys.push(e)
			}else {
				if((req.query.search || req.query.name)==' ' || (req.query.search || req.query.name)=='*'){
					keys.push(e)
				}else{
					if(e.indexOf(req.query.search || req.query.name)>-1){
						keys.push(e)
					}
				}
			}
			
	})
	let resp={
		docs:[],
		page:1,
		pageSize:50000,
		pageCount:1,
		recordCount:keys.length

	}
	keys.forEach((e)=>{
		resp.docs.push({_id:e,name:e})
	})
	cb(resp)
}

function getOne(dbModel, member, req, res, next, cb){
	if(dbModel[req.params.param1]==undefined){
		next({code:'NOT_FOUND',message:`'${req.params.param1}' collection bulunamadi`})
	}else{
		dbModel[req.params.param1].find({}).sort({_id:-1}).limit(1).exec((err,docs)=>{
			if(dberr(err,next)){
				cb(docs)
			}
		})
	}
	

}

