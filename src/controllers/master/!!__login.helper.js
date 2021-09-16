var ctlSettings = require(path.join(__root, 'controllers/repo/settings.controller'))

var myDbDefinesHelper = require('./mydbdefines.helper')
exports.login = function(member, req, res, next, cb) {
	exports.checkMember(member, req, res, next, (memberDoc) => {
		let data = {
			memberId: member._id,
			username: member.username,
			role: member.role,
			userAgent: req.headers['user-agent'] || '',
			ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || '',
			token: (req.body || {}).token || (req.query || {}).token || (req.headers || {})['x-access-token'] || (req.headers || {})['token'] || '',
			dbId: (req.body || {}).db || (req.query || {}).db || '',
			dbName: '',
			mId: '',
			menu: [],
			databases: [],
			settings: []
		}

		myDbDefinesHelper.getList(member, req, res, next, (databases) => {
			data.databases = menuMixDatabases(global.menu, databases)
			exports.newSession(member, data, next, (data2) => {
				cb(data2)
			})
		})
	})
}

exports.changeDb = function(member, req, res, next, cb) {
	let dbId = (req.body || {}).db || (req.query || {}).db || ''
	let sessionId = (req.body || {}).sid || (req.query || {}).sid || ''

	if(dbId == '')
		return next({ code: 'WRONG_PARAMETER', message: 'db parametresi gereklidir' })

	if(sessionId == '')
		return next({ code: 'WRONG_PARAMETER', message: 'sid parametresi gereklidir' })


	db.sessions.findOne({ _id: sessionId, memberId:member._id, passive:false }, (err, sessionDoc) => {
		if(dberr(err, next)) {
			if(sessionDoc) {
				myDbDefinesHelper.getList(member, req, res, next, (databases) => {
					sessionDoc.databases = menuMixDatabases(global.menu, databases)
					sessionDoc.databases.forEach((e) => {
						if(e._id.toString() == dbId) {
							sessionDoc.dbId = e._id.toString()
							sessionDoc.dbName = e.dbName
							sessionDoc.menu = e.menu
							sessionDoc.settings = e.settings || []
						}
					})
					cb(sessionDoc.toJSON())
				})
			} else {
				next({ code: 'SESSION_NOT_FOUND', message: 'Oturum sonlandırılmış. Tekrar giriş yapınız.' })
			}
		}
	})
}

exports.newSession = function(member, data, next, cb) {
	db.sessions.find({ memberId: member._id }).sort({ _id: -1 }).limit(1).exec((err, sonGiris) => {
		if(dberr(err, next)) {
			if(sonGiris.length > 0) {
				data.dbId = (sonGiris[0].dbId || '')
			}
			if(data.dbId == '') {
				if(data.databases.length > 0) {
					data.dbId = databases[databases.length - 1]._id.toString()
					data.dbName = databases[databases.length - 1].dbName
					data.menu = databases[databases.length - 1].menu
					data.settings = databases[databases.length - 1].settings || []
				}
			} else {
				data.databases.forEach((e) => {
					if(e._id.toString() == data.dbId) {
						data.dbId = e._id.toString()
						data.dbName = e.dbName
						data.menu = e.menu
						data.settings = e.settings || []
					}
				})
			}
		}

		var newDoc = new db.sessions(data)
		if(!epValidateSync(newDoc, next))
			return
		repoDbModel(newDoc.dbId, (err, dbModel) => {
			if(!err) {
				ctlSettings.getList(dbModel, member, req, res, next, (resp) => {
					newDoc.settings = resp.docs
					newDoc.save((err, newdoc2) => {
						if(dberr(err, next)) {
							cb(newDoc2.toJSON())
						}
					})
				})
			} else {
				newDoc.settings = []
				newDoc.save((err, newdoc2) => {
					if(dberr(err, next)) {
						cb(newDoc2.toJSON())
					}
				})
			}
		})
	})
}


exports.checkMember = function(member, req, res, next, cb) {
	db.portal_members.findOne({ _id: member._id }, (err, doc) => {
		if(dberr(err, next)) {
			if(doc == null) {
				let newDoc = new db.portal_members(member)
				if(!epValidateSync(newDoc, next))
					return

				newDoc.save((err, newDoc2) => {
					if(dberr(err, next)) {
						cb(newDoc2)
					}
				})
			} else {
				cb(doc)
			}
		}
	})
}

exports.getInitializeData = function(req, res, cb) {
	maxVersion = ''
	exports.getStaticValues((err, sabitDegerler) => {
		if(dberr(err, cb)) {
			exports.getJSONPageLoader(path.join(__root, 'forms'), '.json', '', (err, holder) => {
				if(dberr(err, cb)) {
					var data = {
						version: maxVersion,
						staticValues: sabitDegerler,
						pages: holder,
						menu: menu,
						session: clone(req.session || {}),
						dbId: req.session.dbId,
						dbName: req.session.dbName,
						sessionId: req.session._id || '',
						token: req.session.token || '',
						ispiyonServiceUrl: config.ispiyonService ? config.ispiyonService.url || '' : '',
						settings: (req.session || {}).settings || []
					}

					cb(null, data)
				}
			})
		}
	})
}

exports.getStaticValues = function(callback) {
	var fileName = path.join(__root, 'resources/static-values.json')
	var stValues = require(fileName)
	var stats = fs.statSync(fileName)
	var fileVer = (new Date(stats.mtime)).yyyymmddhhmmss().replaceAll('-', '').replaceAll(' ', '').replaceAll(':', '')
	if(fileVer > maxVersion) {
		maxVersion = fileVer
	}
	api({ endpoint: '/portal-modules', method: 'GET', body: { view: 'list' } }, (err, resp) => {
		if(!err) {

			stValues['modules'] = resp.data
			callback(null, stValues)
		} else {
			console.error(`getStaticValues portal-modules error:`, err)
			callback(err)
		}
	})

}


exports.getJSONPageLoader = function(folder, suffix, expression, callback) {
	try {
		var moduleHolder = {}
		var files = fs.readdirSync(folder)

		var index = 0

		function calistir(cb) {
			if(index >= files.length) {
				return cb(null)
			}
			let f = path.join(folder, files[index])
			var stats = fs.statSync(f)
			var fileVer = (new Date(stats.mtime)).yyyymmddhhmmss().replaceAll('-', '').replaceAll(' ', '').replaceAll(':', '')
			if(maxVersion == '') {
				maxVersion = fileVer
			} else if(fileVer > maxVersion) {
				maxVersion = fileVer
			}
			if(!fs.statSync(f).isDirectory()) {

				var fileName = path.basename(f)
				var apiName = fileName.substr(0, fileName.length - suffix.length)
				if(apiName != '' && (apiName + suffix) == fileName) {

					moduleHolder[apiName] = require(f)
					if(expression != '')
						eventLog(`${expression} ${apiName.cyan} loaded.`)
				}
				index++
				setTimeout(calistir, 0, cb)
			} else {
				var folderName = path.basename(f)
				moduleHolder[folderName] = {}
				exports.getJSONPageLoader(f, suffix, expression, (err, holder) => {
					if(!err) {
						moduleHolder[folderName] = holder
						index++
						setTimeout(calistir, 0, cb)
					} else {
						cb(err)
					}
				})
			}
		}

		calistir((err) => {
			if(!err) {
				callback(null, moduleHolder)
			} else {
				callback(err)
			}

		})


	} catch (e) {
		errorLog(`getJSONPageLoader Error:\r\nfolder:${folder}\r\nsuffix:${suffix}\r\nexpression:${expression}`)
		callback(e)
	}
}

function repairMenu(menu) {
	menu.forEach((m1, index1) => {
		m1.mId = `${index1}`
		//m1=repairMenuPath(m1)

		if(m1.nodes) {
			if(m1.nodes.length > 0) {
				m1.nodes.forEach((m2, index2) => {
					m2.mId = `${index1}.${index2}`
					//m2=repairMenuPath(m2)

					if(m2.nodes) {
						if(m2.nodes.length > 0) {
							m2.nodes.forEach((m3, index3) => {
								m3.mId = `${index1}.${index2}.${index3}`
								//m3=repairMenuPath(m3)
								if(m3.nodes) {
									if(m3.nodes.length > 0) {
										m3.nodes.forEach((m4, index4) => {
											m4.mId = `${index1}.${index2}.${index3}.${index4}`
											//m4=repairMenuPath(m4)
										})
									}
								}
							})
						}
					}
				})
			}
		}
	})
}

global.menu = require(path.join(__root, 'resources', 'menu.json'))
repairMenu(menu)


function menuMixDatabases(menu, databases) {
	databases.forEach((d) => {
		var menu1 = clone(menu)
		var menu2 = []
		menu1.forEach((e) => {
			e = menuModule(e, d.owner.modules)
			if(e != undefined) {
				menu2.push(clone(e))
			}
		})

		d['menu'] = menu2
	})
	return databases
}


function menuModule(menu, modules) {
	if(menu.nodes == undefined) {
		if(menu.module != undefined) {
			var dizi = menu.module.split('.')
			var bShow = false
			if(modules[dizi[0]]) {
				if(dizi.length > 1) {
					if(modules[dizi[0]][dizi[1]]) {
						if(dizi.length > 2) {
							if(modules[dizi[0]][dizi[1]][dizi[2]]) {
								if(dizi.length > 3) {
									if(modules[dizi[0]][dizi[1]][dizi[2]][dizi[3]]) {
										bShow = true
									}
								} else {
									bShow = true
								}
							}
						} else {
							bShow = true
						}
					}
				} else {
					bShow = true
				}
			}
			if(bShow) {
				return menu
			} else {
				return undefined
			}
		} else {
			return menu
		}
	} else {
		var bNodeVar = false
		var nodes = []
		menu.nodes.forEach((e) => {
			e = menuModule(e, modules)
			if(e != undefined)
				nodes.push(clone(e))
		})
		if(nodes.length > 0) {
			menu.nodes = nodes
			return menu
		} else {
			return undefined
		}

	}
}