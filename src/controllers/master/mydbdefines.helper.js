exports.getList = function(member, req, res, next, cb) {
	exports.checkMember(member, req, res, next, (memberDoc) => {
		db.dbdefines.find({ deleted: false, passive: false, $or: [{ owner: memberDoc._id }, { 'authorizedMembers.memberId': memberDoc._id }] }).populate('owner', '_id username name lastName modules').exec((err, docs) => {
			if (!err) {
				console.log(`mydbdefines docs:`, docs)
				var data = []
				docs.forEach((e) => {
					var auth = { owner: false, canRead: false, canWrite: false, canDelete: false }

					if (e.owner._id.toString() == memberDoc._id.toString()) {
						auth.owner = true
						auth.canRead = true
						auth.canWrite = true
						auth.canDelete = true
					} else {
						e.authorizedMembers.forEach((e2) => {
							if (e2.memberId.toString() == memberDoc._id.toString()) {
								auth.canRead = e2.canRead
								auth.canWrite = e2.canWrite
								auth.canDelete = e2.canDelete
								return
							}
						})
					}
					if (auth.canRead) {
						data.push({ _id: e._id, dbName: e.dbName, owner: e.owner, auth: auth })
					}
				})
				cb(data)
			} else {
				console.log(`getList:`, err)
				next({ code: err.name, message: err.message })
			}
		})
	})
}

exports.getOne = function(member, req, res, next, cb) {
	exports.checkMember(member, req, res, next, (err, memberDoc) => {
		if (dberr(err, next)) {
			db.dbdefines.findOne({ _id: req.params.param1, deleted: false, passive: false, owner: memberDoc._id }).populate('owner', '_id username name lastName modules').populate('authorizedMembers.memberId', '_id username name lastName').exec((err, doc) => {
				if (dberr(err, next)) {
					if (dbnull(doc, next)) {
						cb(doc)
					}
				}
			})
		}
	})
}

exports.checkMember = function(member, req, res, next, cb) {
	db.portal_members.findOne({ _id: member._id }, (err, doc) => {
		if (dberr(err, next)) {
			if (doc == null) {
				let newDoc = new db.portal_members(member)
				if (!epValidateSync(newDoc, next))
					return
				console.log(`buraya geliyor2:`)
				newDoc.save((err, newDoc2) => {
					console.log(`err:`, err)
					console.log(`newDoc2:`, newDoc2)
					if (dberr(err, next)) {
						cb(newDoc2)
					}
				})
			} else {
				cb(doc)
			}
		}
	})
}