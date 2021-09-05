module.exports = (member, req, res, next, cb)=>{
    switch(req.method){
        
        case 'POST':
        case 'PUT':
            login(member,req,res,next, cb)
        break
        default:
            error.method(req, next)
        break
    }
}



function login(member,req,res,next, cb){
    if(req.params.param1==undefined){
        cb({success: false,error: {code: 'WRONG_PARAMETER', message: 'Para metre hatali'}})
    }else{
        var data = req.body || {}
        
        data._id = req.params.param1
        db.members.findOne({_id:data._id},function(err,doc){
            if(dberr(err,next)){
                if(doc==null)
                	next({code:'LOGIN_FAILED',message:'Giriş başarısız'})
                if(doc.passive) 
                	next({code:'USER_PASSIVE',message:'Kullanici pasif duruma alinmis.'})
                if(doc.verified==false) 
                	next({code:'USER_NOT_VERIFIED',message:'Kullanici onay kodu alinmamis.'})
                
                var IP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || ''
                var userinfo = { 
                    _id : doc._id,
                    username: doc.username,
                    name: doc.name,
                    lastName: doc.lastName,
                    gender: doc.gender,
                    role : doc.role,
                    isSysUser:false,
                    isMember:true,
                    ip: IP
                }
                var token
                var jwt = require('jsonwebtoken')
                if(doc.ismobile){
                    token=jwt.sign(userinfo, 'gizliSir', {expiresIn: 5*365*1440*60})
                }else{
                    token=jwt.sign(userinfo, 'gizliSir', {expiresIn: 30*1440*60})
                }
                cb({username:doc.username, isSysUser:false,isMember:true, role:doc.role, token:token})
            }
            
        })
    }
}


