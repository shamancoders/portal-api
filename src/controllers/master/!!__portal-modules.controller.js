module.exports = (member, req, res, next, cb)=>{
	var view=req.body.view || req.query.view || ''
	var resourceFileName=path.join(__root,'resources/portal-modules.json')
	var modules=require(resourceFileName)
	var listObj=objectToListObject(require(resourceFileName))
	Object.keys(listObj).forEach((key)=>{
		if(typeof listObj[key]=='boolean'){
			listObj[key]=key
		}
	})
	
	switch(view){
		case 'list':
		cb(listObj)
		break

		default:
		cb(modules)
		break
	}
}
