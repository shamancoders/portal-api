module.exports = (member, req, res, next, cb) => {
	switch (req.method) {
		case 'GET':
			if(req.params.param1 == undefined || req.params.param1 == 'profile') {
				getMyProfile(member, req, res, next, cb)
			} else if(req.params.param1 == 'notifications') {
				if(req.params.param2 != undefined) {
					getOneNotification(member, req, res, next, cb)
				} else {
					getNotificationList(member, req, res, next, cb)
				}
			} else {
				error.param1(req, next)
			}

			break
		case 'PUT':
			if(req.params.param1 == undefined || req.params.param1 == 'profile') {
				put(member, req, res, next, cb)
			} else {
				error.param1(req, next)
			}

			break
		default:
			error.method(req, next)
			break
	}
}


function getMyProfile(member, req, res, next, cb) {
	db.portal_members.findOne({ _id: member._id },(err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				cb(doc)
			}
		}
	})
}


function put(member, req, res, next, cb) {
	db.portal_members.findOne({ _id: member._id }, (err, doc) => {
		if(dberr(err, next)) {
			if(dbnull(doc, next)) {
				let data = req.body || {}
				doc.name = data.name || ''
				doc.lastName = data.lastName || ''
				doc.gender = data.gender || doc.gender
				doc.save((err,doc2)=>{
					if(dberr(err, next)) {
						cb(doc2)
					}
				})
			}
		}
	})
}

function getNotificationList(member, req, res, next, cb) {
	let options = {
		page: (req.query.page || 1)
	}

	if((req.query.pageSize || req.query.limit))
		options['limit'] = req.query.pageSize || req.query.limit

	let filter = { member: member._id }

	if((req.query.isRead || '') != '')
		filter['isRead'] = req.query.isRead

	db.notifications.paginate(filter, options, (err, resp) => {
		if(dberr(err, next)) {
			cb(resp)
		}
	})
}

function getOneNotification(member, req, res, next, cb) {

	db.notifications.findOne({ _id: req.params.param2, member: member._id }, (err, doc) => {
		if(dberr(err, next)) {
			cb(doc)
		}
	})
}