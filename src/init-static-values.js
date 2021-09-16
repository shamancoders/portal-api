global.portalConstants = {
	mainMenu: [],
	moduleList: {},
	staticValues: {},
	pages: {},
	version: global.version,

}
let maxVersion = ''

module.exports = () => {
	portalConstants.mainMenu = repairMenu(require(path.join(__root, 'resources', 'menu.json')))
	
	portalConstants.staticValues = require('./resources/static-values.json')
	portalConstants.pages = getJSONPages(path.join(__root, 'resources/forms'), '.json', '')
	
	portalConstants.moduleList=objectToListObject(require(path.join(__root, 'resources', 'portal-modules.json')))
	Object.keys(portalConstants.moduleList).forEach((key)=>{
		if(typeof portalConstants.moduleList[key]=='boolean'){
			portalConstants.moduleList[key]=key
		}
	})
	portalConstants.staticValues.modules=portalConstants.moduleList
	// tempLog('list_modules.json',JSON.stringify(portalConstants.modules,null,2))
}

function getJSONPages(folder, suffix, expression) {
	var moduleHolder = {}
	var files = fs.readdirSync(folder)

	files.forEach((e) => {
		let fileName = path.join(folder, e)
		let fileVer = fileVersion(fileName)
		if(fileVer > portalConstants.version || portalConstants.version == '')
			portalConstants.version = fileVer

		if(!fs.statSync(fileName).isDirectory()) {
			let fName = path.basename(fileName)
			let apiName = fName.substr(0, fName.length - suffix.length)
			if(apiName != '' && (apiName + suffix) == fName) {
				moduleHolder[apiName] = require(fileName)
				if(expression != '')
					eventLog(`${expression} ${apiName.cyan} loaded.`)
			}

		} else {
			let folderName = path.basename(fileName)
			moduleHolder[folderName] = getJSONPages(fileName, suffix, expression)
		}
	})
	return moduleHolder
}

// function getInitializeData(cb) {
// 	maxVersion = ''
// 	getStaticValues((err, sabitDegerler) => {
// 		if(!err) {
// 			getJSONPageLoader(path.join(__root, 'resources/forms'), '.json', '', (err, holder) => {
// 				if(dberr(err, next)) {
// 					var data = {
// 						version: maxVersion,
// 						staticValues: sabitDegerler,
// 						pages: holder,
// 						// menu: mainMenu,
// 					}

// 					cb(null,data)
// 				}
// 			})
// 		}else{
// 			cb(err)
// 		}
// 	})
// }

// function getStaticValues(callback) {
// 	var fileName = path.join(__root, 'resources/static-values.json')
// 	var stValues = require(fileName)
// 	var stats = fs.statSync(fileName)
// 	var fileVer = (new Date(stats.mtime)).yyyymmddhhmmss().replaceAll('-', '').replaceAll(' ', '').replaceAll(':', '')
// 	if(fileVer > maxVersion) {
// 		maxVersion = fileVer
// 	}

// 	var portalModulesList = objectToListObject(require(path.join(__root, 'resources/portal-modules.json')))
// 	Object.keys(portalModulesList).forEach((key) => {
// 		if(typeof portalModulesList[key] == 'boolean') {
// 			portalModulesList[key] = key
// 		}
// 	})
// 	stValues['modules'] = portalModulesList
// 	callback(null, stValues)
// }

// function getJSONPageLoader(folder, suffix, expression, callback) {
// 	try {
// 		var moduleHolder = {}
// 		var files = fs.readdirSync(folder)

// 		var index = 0

// 		function calistir(cb) {
// 			if(index >= files.length) {
// 				return cb(null)
// 			}
// 			let f = path.join(folder, files[index])
// 			var stats = fs.statSync(f)
// 			var fileVer = (new Date(stats.mtime)).yyyymmddhhmmss().replaceAll('-', '').replaceAll(' ', '').replaceAll(':', '')
// 			if(maxVersion == '') {
// 				maxVersion = fileVer
// 			} else if(fileVer > maxVersion) {
// 				maxVersion = fileVer
// 			}
// 			if(!fs.statSync(f).isDirectory()) {

// 				var fileName = path.basename(f)
// 				var apiName = fileName.substr(0, fileName.length - suffix.length)
// 				if(apiName != '' && (apiName + suffix) == fileName) {

// 					moduleHolder[apiName] = require(f)
// 					if(expression != '')
// 						eventLog(`${expression} ${apiName.cyan} loaded.`)
// 				}
// 				index++
// 				setTimeout(calistir, 0, cb)
// 			} else {
// 				var folderName = path.basename(f)
// 				moduleHolder[folderName] = {}
// 				getJSONPageLoader(f, suffix, expression, (err, holder) => {
// 					if(!err) {
// 						moduleHolder[folderName] = holder
// 						index++
// 						setTimeout(calistir, 0, cb)
// 					} else {
// 						cb(err)
// 					}
// 				})
// 			}
// 		}

// 		calistir((err) => {
// 			if(!err) {
// 				callback(null, moduleHolder)
// 			} else {
// 				callback(err)
// 			}

// 		})


// 	} catch (e) {
// 		errorLog(`getJSONPageLoader Error:\r\nfolder:${folder}\r\nsuffix:${suffix}\r\nexpression:${expression}`)
// 		callback(e)
// 	}
// }

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
	return menu
}