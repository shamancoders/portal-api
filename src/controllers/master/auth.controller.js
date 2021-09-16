// userinfo = { 
// 		_id : doc._id,
// 		username: doc.username,
//		role : doc.role
// 	}
module.exports = function(member, req, res, next, cb) {
	auth.proxy(req, res, (err, userInfo) => {
		if(dberr(err, next)) {
			cb(userInfo)
		}
	})
}