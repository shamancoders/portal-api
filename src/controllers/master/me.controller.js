module.exports = (member, req, res, next, cb)=>{
	switch(req.method){
		case 'GET':
		getMyProfile(member,req,res,next,cb)
		break
		case 'PUT':
		put(member,req,res,next,cb)

		break
		default:
		error.method(req,next)
		break
	}
}



function getMyProfile(member,req,res,next,cb){
	let summary=req.query.summary || false
	let populate=[]
	let select='-mainPicture'
	if(summary){
		populate.push({path:'mainPicture', select:'_id large rotate marginTop marginLeft zoom'})
		select='-images'
	}else{
		populate.push({path:'images', select:'_id data rotate marginTop marginLeft zoom'})
	}

	db.members.findOne({_id:member._id}).select(select).populate(populate).exec((err,doc)=>{
		if(dberr(err, next)){
			if(dbnull(doc, next)){
				doc=doc.toJSON()
				var myProfile={
					_id:doc._id,
					name:doc.name,
					lastName:doc.lastName,
					username:doc.username,
					email:doc.email,
					gender:doc.gender,
					showName:doc.showName,
					showPicture:doc.showPicture,
					profileEnabled:doc.profileEnabled,
					mainPicture:{},
					images:[]
				}
				myProfile.mainPicture=changeImageObject(doc.mainPicture)
				if(doc.images){
					doc.images.forEach((e)=>{
						myProfile.images.push(changeImageObject(e))
					})
				}
				
				tempLog('doc2.json',JSON.stringify(doc,null,2))

				cb(myProfile)
			}
		}
	})  
}

function put(member,req,res,next,cb){
	db.members.findOne({_id:member._id},(err,doc)=>{
		if(dberr(err, next)){
			if(dbnull(doc, next)){
				let data=req.body || {}
				
				doc.name=data.name || ''
				doc.lastName=data.lastName || ''
				doc.email=data.email || doc.email
				doc.gender=data.gender || doc.gender
				doc.showName=data.showName || doc.showName
				doc.showPicture=data.showPicture || doc.showPicture
				doc.profileEnabled=data.profileEnabled || doc.profileEnabled

				var oldPassword=data.oldPassword || ''
				var newPassword=data.newPassword || ''
				var rePassword=data.rePassword || ''
				if(oldPassword!='' || newPassword!='' || rePassword!=''){
					if(newPassword.trim()=='') 
						return next({code:'REQUIRE_FIELD',message:'Yeni parola gereklidir.'})
					if(oldPassword!=doc.password) 
						return next({code:'PASSWORD_WRONG',message:'Eski parola hatali.'})
					if(req.body.rePassword!=undefined){
						if(newPassword!=rePassword)
							return next({code:'REQUIRE_FIELD',message:'Yeni tekrar parola hatali.'})
					}
					doc.password=newPassword
				}
				if(doc.name.trim()=='') 
					return next({code:'REQUIRE_FIELD',message:'Isim gereklidir.'})
				if(doc.lastName.trim()=='') 
					return next({code:'REQUIRE_FIELD',message:'Soyad gereklidir.'})

				if(doc.gender!='male' && doc.gender!='female') 
					return next({code:'REQUIRE_FIELD',message:'Cinsiyet hatali.'})

				saveImages(member,data,(err,data)=>{
					if(dberr(err, next)){
						if(data.images){
							doc.mainPicture=data.mainPicture
							doc.images=data.images
						}


						doc.save((err,newDoc)=>{
							if(dberr(err, next)){
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
				})
				
			}
		}
	})  
}



function saveImages(member,data,cb){
	if(!data.images){
		return cb(null,data)
	}
	let resimler=data.images
	if(!Array.isArray(resimler)){
		resimler=[resimler]
	}


	let imageList=[]
	let index=0


	function calistir(cb1){
		if(index>=resimler.length)
			return cb1()

		if(resimler[index]._id){
			db.images.findOne({_id:resimler[index]._id, uploadById:member._id},(err,doc)=>{
				if(dberr(err,cb1)){
					if(dbnull(doc,cb1)){
						doc.caption=resimler[index].caption || doc.caption || ''
						doc.tags=resimler[index].tags || doc.tags || ''
						doc.blur=resimler[index].blur!=undefined?resimler[index].blur:doc.blur
						doc.adult=resimler[index].adult!=undefined?resimler[index].adult:doc.adult
						doc.passive=resimler[index].passive!=undefined?resimler[index].passive:doc.passive
						doc.rotate=resimler[index].rotate!=undefined?resimler[index].rotate:doc.rotate
						doc.zoom=resimler[index].zoom!=undefined?resimler[index].zoom:doc.zoom
						doc.marginTop=resimler[index].marginTop!=undefined?resimler[index].marginTop:doc.marginTop
						doc.marginLeft=resimler[index].marginLeft!=undefined?resimler[index].marginLeft:doc.marginLeft
						doc.save((err)=>{
							if(!err){
								imageList.push(doc._id)
								index++
								setTimeout(calistir,0,cb1)
							}else{
								cb1(err)
							}
						})
					}
				}
			})
		}else{
			let imgData={
				uploadById:member?member._id:null,
				caption:resimler[index].caption || '',
				tags:resimler[index].tags || '',
				fileName:resimler[index].fileName || '',
				width:resimler[index].width || 0,
				height:resimler[index].height || 0,
				data:resimler[index].data || '',
				small:resimler[index].small || '',
				medium:resimler[index].medium || '',
				large:resimler[index].large || '',
				blur:resimler[index].blur || false,
				adult:resimler[index].adult || false,
				passive:resimler[index].passive || false,
				rotate:resimler[index].rotate || 0,
				zoom:resimler[index].zoom || 0,
				marginTop:resimler[index].marginTop || 0,
				marginLeft:resimler[index].marginLeft || 0
			}
			let newDoc=new db.images(imgData)
			newDoc.save((err,newDoc2)=>{
				if(!err){
					imageList.push(newDoc2._id)
					index++
					setTimeout(calistir,0,cb1)
				}else{
					cb1(err)
				}
			})
		}

	}

	calistir((err)=>{
		if(!err){
			
			delete data.images

			data.images=imageList
			if(data.images.length>0){
				data.mainPicture=data.images[0]
			}else{
				data.mainPicture=null

			}
			console.log(`data.mainPicture:`,data.mainPicture)
			cb(null,data)
		}else{
			cb(err)
		}
	})
}
