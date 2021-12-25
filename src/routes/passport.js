var exceptedFunc = ['auth', 'status', 'modules', 'portal-modules', 'cities', 'provinces']
module.exports = function(req, res, cb) {
	if(exceptedFunc.includes(req.params.func)) {
		cb(null)
	} else {
		let token = req.body.token || req.query.token || req.headers['x-access-token'] || req.headers['token'] || ''
		db.sessions.findOne({ token: token, passive: false }, (err, doc) => {
			if(!err && doc) {
				cb({ _id: doc.memberId, username: doc.username, role: doc.role })
			} else {
				auth.request('/passport', req, res, (err, resp) => {
					if(!err) {
						// decoded
						cb(resp)
					} else {
						throw err
					}
				})
			}
		})

	}
}