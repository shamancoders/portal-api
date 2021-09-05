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
        populate:[
            {path:'item',select:'_id name'},
            {path:'details.locationId',select:'_id locationName locationType'}
        ]
        
    }
    if(!req.query.page){
        options.limit=50000
    }
    var filter = {}

    if((req.query.item || '')!=''){
        filter['item']=req.query.item
    }
    if((req.query.locationId || req.query.location || '')!=''){
        filter['details.locationId']=req.query.locationId || req.query.location
    }
   

    dbModel.inventory_lives.paginate(filter,options,(err, resp)=>{
        if(dberr(err,next)){
            cb(resp)
        }
    })
}

function getOne(dbModel, member, req, res, next, cb){
    var populate=[
        {path:'item',select:'_id name'},
        {path:'details.locationId',select:'_id locationName locationType'}
    ]
    dbModel.inventory_lives.findOne({$or:[{item:req.params.param1},{_id:req.params.param1}]}).populate(populate).exec((err,doc)=>{
        if (!err) {
            cb(doc)
        }
    })
}

