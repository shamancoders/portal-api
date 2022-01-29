// var express = require('express')
// var router = express.Router()
var passport = require('./passport')

var protectedFields = require('./protected-fields.json')
var appJsModifiedDate = (new Date(fs.statSync(path.join(__root, 'app.js')).mtime)).yyyymmddhhmmss()

module.exports = (app) => {
	app.all('/', (req, res, next) => {
		res.status(200).json({
			success: true,
			data: {
				name: app.get('name'),
				version: app.get('version')
			}
		})
	})

	masterControllers(app)
	clientControllers(app)

	// catch 404 and forward to error handler
	app.use((req, res, next) => {
		res.status(404).json({ success: false, error: { code: '404', message: 'function not found' } })
	})

	app.use((err,req, res, next)=>{
		sendError(err,res)
	})
}

function clientControllers(app) {
	app.all('/api/v1/:dbId/*', (req, res, next) => {
		next()
	})

	setRoutes(app, '/api/v1/:dbId/:func/:param1/:param2/:param3', setRepoAPIFunctions)

	function setRepoAPIFunctions(req, res, next) {
		var ctl = getRepoController(req.params.func)
		if(!ctl) {
			return next()
		}
		passport(req, res, (member) => {
			repoDbModel(req.params.dbId, (err, dbModel) => {
				if(!err) {
					ctl(dbModel, member, req, res, next, (data) => {
						if(data == undefined) {
							res.json({ success: true })
						} else if(data == null) {
							res.json({ success: true })
						} else if(data.file != undefined) {
							downloadFile(data.file, req, res, next)
						} else if(data.fileId != undefined) {
							downloadFileId(dbModel, data.fileId, req, res, next)
						} else if(data.sendFile != undefined) {
							sendFile(data.sendFile, req, res, next)
						} else if(data.sendFileId != undefined) {
							sendFileId(dbModel, data.sendFileId, req, res, next)
						} else {
							data = clearProtectedFields(req.params.func, data)
							res.status(200).json({ success: true, data: data })
						}
						
						dbModel.free()
					})
				} else {

					next(err)
				}
			})
		})

	}

	function getRepoController(funcName) {

		let controllerName = path.join(__root, 'controllers/repo', `${funcName}.controller.js`)
		if(fs.existsSync(controllerName) == false) {
			return
		} else {
			return require(controllerName)
		}
	}
}

function masterControllers(app) {
	app.all('/api', function(req, res) {
		res.status(200).json({ success: true, data:`Welcome to Gany.master API V1. Last modified:${appJsModifiedDate}. Your path:/api ,Please use: /api/v1[/:dbId]/:func/[:param1]/[:param2]/[:param3] . Methods: GET, POST, PUT, DELETE` , status:config.status})
	})

	app.all('/api/v1', function(req, res) {
		res.status(200).json({ success: true, data: `Welcome to GanyGo.master API V1. Last modified:${appJsModifiedDate}. Your path:/api/v1 ,Please use: /api/v1[/:dbId]/:func/[:param1]/[:param2]/[:param3] . Methods: GET, POST, PUT, DELETE`, status:config.status })
	})

	app.all('/api/v1/web', function(req, res, next) {
		res.status(200).json({ success: true, data: `Welcome to GanyGo.web API V1. Last modified:${appJsModifiedDate}. Your path:/api/v1 ,Please use: /api/v1/web[/:dbId]/:func/[:param1]/[:param2]/[:param3] . Methods: GET, POST, PUT, DELETE`, status:config.status })
	})

	setRoutes(app, '/api/v1/web/:func/:param1/:param2/:param3', setWebAPIFunctions)
	setRoutes(app, '/api/v1/:func/:param1/:param2/:param3', setAPIFunctions)

	function setAPIFunctions(req, res, next) {
		let ctl = getController(req.params.func)
		if(!ctl) {
			return next()
		}
		passport(req, res, (member) => {
			ctl(member, req, res, next, (data) => {

				if(data == undefined)
					res.json({ success: true })
				else if(data == null)
					res.json({ success: true })
				else if(data.file != undefined)
					downloadFile(data.file, req, res, next)
				else if(data.fileId != undefined)
					downloadFileId(db, data.fileId, req, res, next)
				else {
					data = clearProtectedFields(req.params.func, data)
					res.status(200).json({ success: true, data: data })
				}
			})
		})
	}

	function getController(funcName) {

		let controllerName = path.join(__root, 'controllers/master', `${funcName}.controller.js`)
		if(fs.existsSync(controllerName) == false) {
			return null
		} else {
			return require(controllerName)
		}
	}

	function setWebAPIFunctions(req, res, next) {
		let ctl = getWebController(req.params.func)
		if(!ctl) {
			return next()
		}
		passportWeb(req, res, (member) => {
			ctl(member, req, res, next, (data) => {

				if(data == undefined)
					res.json({ success: true })
				else if(data == null)
					res.json({ success: true })
				else if(data.file != undefined)
					downloadFile(data.file, req, res, next)
				else if(data.fileId != undefined)
					downloadFileId(db, data.fileId, req, res, next)
				else {
					data = clearProtectedFields(req.params.func, data)
					res.status(200).json({ success: true, data: data })
				}
			})
		})
	}

	function getWebController(funcName) {
		let controllerName = path.join(__root, 'controllers/web', `${funcName}.controller.js`)
		if(fs.existsSync(controllerName) == false) {
			return
		} else {
			return require(controllerName)
		}
	}
}

function sendError(err, res) {
	var error = { code: '403', message: '' }
	if(typeof err == 'string') {
		error.message = err
	} else {
		error.code = err.code || err.name || 'ERROR'
		if(err.message)
			error.message = err.message
		else
			error.message = err.name || ''
	}
	res.status(403).json({ success: false, error: error })
}

function clearProtectedFields(funcName, data, cb) {
	if(protectedFields != undefined) {
		if(protectedFields[funcName] == undefined)
			protectedFields[funcName] = protectedFields['standart']

		if(data != undefined) {
			if(Array.isArray(data)) {
				data.forEach((e) => {
					e = util.deleteObjectFields(e, protectedFields[funcName].outputFields)
				})

			} else {
				if(data.hasOwnProperty('docs')) {
					data.docs.forEach((e) => {
						e = util.deleteObjectFields(e, protectedFields[funcName].outputFields)
					})
				}
				data = util.deleteObjectFields(data, protectedFields[funcName].outputFields)
			}
			return data
		} else {
			return data
		}
	} else {
		return data
	}

}

function setRoutes(app, route, cb1, cb2) {
	let dizi = route.split('/:')
	let yol = ''
	dizi.forEach((e, index) => {
		if(index > 0) {
			yol += `/:${e}`
			if(cb1 != undefined && cb2 == undefined) {
				app.all(yol, cb1)
			} else if(cb1 != undefined && cb2 != undefined) {
				app.all(yol, cb1, cb2)
			}

		} else {
			yol += e
		}
	})
}

global.error = {
	param1: function(req, next) {
		next({ code: 'WRONG_PARAMETER', message: `function:[/${req.params.func}] [/:param1] is required` })
	},
	param2: function(req, next) {
		next({ code: 'WRONG_PARAMETER', message: `function:[/${req.params.func}/${req.params.param1}] [/:param2] is required` })
	},
	method: function(req, next) {
		next({ code: 'WRONG_METHOD', message: `function:${req.params.func} WRONG METHOD: ${req.method}` })
	},
	auth: function(req, next) {
		next({ code: 'AUTHENTICATION', message: `Yetki hatası` })
	},
	data: function(req, next, field) {
		if(field) {
			next({ code: 'WRONG_DATA', message: `"${field}" Yanlış ya da eksik veri` })

		} else {
			next({ code: 'WRONG_DATA', message: `Yanlış ya da eksik veri` })

		}
	}
}