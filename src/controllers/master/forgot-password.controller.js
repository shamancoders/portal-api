var https = require('https')
var http = require('http')

module.exports= (member, req, res, next, cb)=>{
	if(req.method=='POST' || req.method=='PUT'){
		var IP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || ''

		var formdata={
			username: util.clearText(req.body.username || req.query.username || ''),
		}
		if(formdata.username.trim()=="")
			throw {code:'USERNAME_EMPTY',message:'Telefon numarasi veya email bos olamaz.'}


		db.members.findOne({username:formdata.username},function(err,doc){
			if(dberr(err, next))
				if(dbnull(doc, next)){
					if(doc.verified==false) 
						throw {code:'USER_NOT_VERIFIED',message:'Kullanici onay kodu girilmemis. Uye olunuz.'}

					if(util.validEmail(formdata.username)){
						mailsend(formdata.username,doc.password,next,(data)=>{
							cb(data)
						})
					}else if(util.validTelephone(formdata.username)){
						smssend(formdata.username,doc.password,next,(data)=>{
							cb(data)
						})
					}else{
						throw {code:'USERNAME_WRONG',message:'Kullanici adi hatali.'}
					}
				}
			})
	}else{
		error.method(req,next)
	}
}


function smssend(phonenumber,password,next,callback){
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
			messages:[
			{
				msg:`PAROLANIZ: ${password}  `,
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
			next(error?error:body.error,body)
		}
	})
}

function mailsend(email,password,next,callback){
	var subject="Parola Hatirlatma"
	var body="Parolaniz : " + password
	main.sendMail(email,subject,body,(err,data)=>{
		if(!err){
			callback(data)
		}else{
			throw err
		}
	})

}