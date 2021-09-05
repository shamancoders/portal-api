module.exports = (member, req, res, next, cb)=>{

	switch(req.method){
		case 'GET':
		getMyProfile(member,req,res, next, cb)
		break
		case 'PUT':
		put(member,req,res,next, cb)
		break
		default:
		error.method(req, next)
		break
	}
}


function getMyProfile(member,req,res,next,cb){
	db.sysusers.findOne({_id:member._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				var myProfile={
					_id:doc._id,
					name:doc.name,
					lastName:doc.lastName,
					username:doc.username,
					email:doc.email,
					gender:doc.gender
				}
				cb(myProfile)
			}
		}
	})  
}

function put(member,req,res,next,cb){
	db.sysusers.findOne({_id:member._id},(err,doc)=>{
		if(dberr(err,next)){
			if(dbnull(doc,next)){
				doc.name=req.body.name || ''
				doc.lastName=req.body.lastName || ''
				doc.email=req.body.email || ''
				doc.gender=req.body.gender || ''

				var oldPassword=req.body.oldPassword || ''
				var newPassword=req.body.newPassword || ''

				if(doc.name.trim()=='')
					throw {code:'REQUIRE_FIELD',message:'Isim gereklidir.'}
				if(doc.lastName.trim()=='')
					throw {code:'REQUIRE_FIELD',message:'Soyad gereklidir.'}
				if(oldPassword!='' || newPassword!=''){
					if(oldPassword!=doc.password) 
						throw {code:'PASSWORD_WRONG',message:'Eski parola hatali.'}
					doc.password=newPassword
				}
				if(doc.gender!='male' && doc.gender!='female') 
					throw {code:'REQUIRE_FIELD',message:'Cinsiyet hatali.'}

				doc.save((err,newDoc)=>{
					if(dberr(err,next)){
						var myProfile={
							_id:newDoc._id,
							name:newDoc.name,
							lastName:newDoc.lastName,
							username:newDoc.username,
							email:newDoc.email,
							gender:newDoc.gender
						}
						cb(myProfile)
					}
				})
			}
		}
	})  
}


