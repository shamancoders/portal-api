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
    var options={page: (req.query.page || 1),
        sort:{issueDate:-1, issueTime:-1}
        
    }
    if(!req.query.page)
        options.limit=50000
    
    var filter = {}

    if((req.query.actionType || '')!='')
        filter['actionType']=req.query.actionType
    
    if((req.query.actionCode || '')!='')
        filter['actionCode']=req.query.actionCode
    
    if((req.query.ioType || '')!='')
        filter['ioType']=req.query.ioType
    
    if((req.query.docId || '')!='')
        filter['docId']=req.query.docId
    
    if((req.query.description || '')!='')
        filter['description']={ $regex: '.*' + req.query.description + '.*' ,$options: 'i' }
    
    if((req.query.docNo || '')!='')
        filter['docNo']={ $regex: '.*' + req.query.docNo + '.*' ,$options: 'i' }

    dbModel.actions.paginate(filter,options,(err, resp)=>{
        if(dberr(err,next)){
            cb(resp)
        }
    })
}

function getOne(dbModel, member, req, res, next, cb){
    var populate=[] //qwerty

    dbModel.actions.findOne({_id:req.params.param1}).populate([]).exec((err,doc)=>{
        if(dberr(err,next)){
            cb(doc)
        }
    })
}

