var https = require('https')
var http = require('http')

console.log(`signup controller:`)
module.exports= (member, req, res, next, cb)=>{
	if(req.method=='POST'){
		var IP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || ''

		var formdata={
			date:new Date(), 
			ip : IP, 
			username: util.clearText(req.body.username || ''),
			
			password: util.clearText(req.body.password || ''),
			name: util.clearText(req.body.name || ''),
			lastName: util.clearText(req.body.lastName || ''),
			gender: util.clearText(req.body.gender || ''),
			deviceid: util.clearText(req.body.deviceid || ''),
			devicetoken: util.clearText(req.body.devicetoken || '')
		}
		if(formdata.username.trim()=='')
			return next({code:'USERNAME_EMPTY',message:'Telefon numarasi veya email bos olamaz.'})

		db.members.findOne({username:formdata.username},(err,doc)=>{
			if(dberr(err, next)){
				if(doc!=null){
					if(doc.verified)
						return next({code:'USER_EXISTS',message:'Kullanici zaten kayitli.'})

					//if(doc.authCode==''){
						doc.authCode=util.randomNumber(100200,998000).toString()

						doc.save()
					//}

					if(util.validEmail(formdata.username)){
						mailsend(formdata.username,doc.authCode,next,(data)=>{
							cb(data)
						})
					}else if(util.validTelephone(formdata.username)){
						smssend(formdata.username,doc.authCode,next,(data)=>{
							cb(data)
						})
					}else{
						return next({code:'USERNAME_WRONG',message:'Kullanici adi hatali.'})
					}
				}else{
					signup(formdata,next,(data)=>{
						cb(data)
					})
				}
			}
		})
	}else{
		error.method(req,next)
	}
}


function signup(formdata,next,cb){
	var authCode=util.randomNumber(100200,998000).toString()
	var ismobile=false
	if(util.validEmail(formdata.username)){
		ismobile=false
	}else if(util.validTelephone(formdata.username)){
		ismobile=true
	}else{
		return next({code:'USERNAME_WRONG',message:'Kullanici adi hatali.'})
	}
	var newmember = new db.members({
		username:formdata.username,
		password:formdata.password,
		name:formdata.name,
		lastName:formdata.lastName,
		gender:formdata.gender,
		ismobile: ismobile,
		country: formdata.country,
		role: formdata.role,
		authCode: authCode,
		ip:formdata.ip,
		deviceid:formdata.deviceid,
		devicetoken:formdata.devicetoken
	})
	newmember.save((err,newDoc)=>{
		if(dberr(err, next)){
			if(ismobile){
				smssend(newDoc.username,newDoc.authCode,next,(data)=>{
					cb(data)
				})
			}else{
				mailsend(newDoc.username,newDoc.authCode,next,(data)=>{
					cb(data)
				})
			}

		}
	})

}


function smssend(phonenumber,authCode,next,callback){
	
	
	var options = {
		url: `https://sms.verimor.com.tr/v2/send.json`,
		method: 'POST',
		headers: {
			'Content-Type':'application/json; charset=utf-8'
		},
		rejectUnauthorized: false,
		json:{
			username:'902167060842',
			password:'atabar18',
			// source_addr:'902167060842',
			messages:[
			{
				msg:`${authCode} GANYGO ONAY KODUNUZ  `,
				dest:phonenumber
			}
			]
		}
	}

	request(options, function (error, response, body) {
		if (!error && response.statusCode==200) {
			if(typeof body=='string'){
				try{
					var resp=JSON.parse(body)
					callback(resp)
					
				}catch(e){
					if(!e.hasOwnProperty('message')){
						next({code: 'API_ERROR_DELETE', message: e.message})
					}else{
						next({code: 'API_ERROR_DELETE', message: e})
					}

				}
			}else{
				callback(body)
			}

		}else{
			console.log(`request error body:`, body)
			next(error?error:body.error,body)
		}
	})

	
}

function mailsend(email,authCode,next,callback){
	var subject="Uyelik onay kodu"
	var body=`Onay Kodunuz : ${authCode}`
	mail.sendMail(email,subject,body,(err,data)=>{
		if(!err){
			callback(data)
		}else{
			next(err)
		}
	})

}