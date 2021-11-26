global.portalConstants = {
	mainMenu: [],
	moduleList: {},
	staticValues: {},
	pages: {},
	widgets: {},
	version: global.version,

}
let maxVersion = ''

module.exports = ()=>{
	portalConstants.mainMenu = repairMenu(loadJSONFile(path.join(__root, 'resources', 'menu.json')))
	
	portalConstants.staticValues = loadJSONFile(path.join(__root,'/resources/static-values.json'))
	
	portalConstants.pages = getJSONPages(path.join(__root, 'resources/forms'), '.json', 'page')
	portalConstants.widgets = getJSONPages(path.join(__root, 'resources/widgets'), '.json', 'widget')
	portalConstants.javascripts = getJSFiles(path.join(__root, 'resources/javascripts'), '.js', 'js file')
	portalConstants.moduleList=objectToListObject(loadJSONFile(path.join(__root, 'resources', 'portal-modules.json')))
	Object.keys(portalConstants.moduleList).forEach((key)=>{
		if(typeof portalConstants.moduleList[key]=='boolean'){
			portalConstants.moduleList[key]=key
		}
	})

	portalConstants.staticValues.modules=portalConstants.moduleList
	console.log(`portalConstants.javascripts :`,portalConstants.javascripts )
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

				if(fileName.substr(-5)=='.json'){
					moduleHolder[apiName] = loadJSONFile(fileName)
				}else{
					moduleHolder[apiName] = require(fileName)
				}
				
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

function getJSFiles(folder, suffix, expression) {
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

				if(fileName.substr(-3)=='.js'){
					let sbuf=fs.readFileSync(fileName,'utf8')
					sbuf=sbuf.replaceAll('\r\n','\n')
					moduleHolder[fName] = sbuf.split('\n')
					if(expression != '')
					eventLog(`${expression} ${fName.cyan} loaded.`)

				}
			}

		} else {
			let folderName = path.basename(fileName)
			moduleHolder[folderName] = getJSONPages(fileName, suffix, expression)
		}
	})
	return moduleHolder
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
	return menu
}