var createError = require('http-errors')
var express = require('express')
var path = require('path')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var logger = require('morgan')
var favicon = require('serve-favicon')
var methodOverride = require('method-override')
//var indexRouter = require('./routes/index')
var dbLoader = require('./db/db-loader')
var httpServer = require('./lib/http-server.js')

global.staticValues = loadJSONFile(path.join(__root, '/resources/static-values.json'))
global.portalModules = loadJSONFile(path.join(__root, '/resources/portal-modules.json'))
global.version = '20210916'


global.app = express()
var cors = require('cors')
app.use(cors())
// var flash = require('connect-flash')

app.use(favicon(path.join(__dirname, 'resources', 'web-icon.png')))

app.use(logger('dev'))
app.use(bodyParser.json({ limit: "100mb" }))
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true, parameterLimit: 50000 }))
app.use(cookieParser())
app.use(methodOverride())

//indexRouter(app)


app.set('port', config.httpserver.port)

global.fileImporter = require('./lib/file_importer')
global.documentHelper = require('./lib/document_helper')
global.printHelper = require('./lib/print_helper')
global.programs = require('./services/programs/programs')
global.auth = require('./lib/rest-helper')(config.passport_api)

if(config.status != 'development') {
	process.on('uncaughtException', function(err) {
		errorLog('Caught exception: ', err)
		mail.sendErrorMail(`${(new Date()).yyyymmddhhmmss()} ${app.get('name')} Error`, err)
	})
}



module.exports = () => {
	httpServer(app, (err, server, port) => {
		dbLoader((err) => {
			if(!err) {
				require('./init-static-values.js')()
				require('./routes/index')(app)
				testControllers(false)
				// console.log(`restServices:`,restServices)
				// console.log(`config.restServices:`,config.restServices)
			} else {
				errorLog(err)
			}
		})
	})
}


/* [CONTROLLER TEST] */
function testControllers(log) {
	moduleLoader(path.join(__dirname, 'controllers'), '.controller.js', (log ? 'master controllers testing' : ''), (err, holder) => {
		if(!err) {
			eventLog(`test master controllers OK ${Object.keys(holder).length.toString().yellow}`)
			moduleLoader(path.join(__dirname, 'controllers/system'), '.controller.js', (log ? 'system controllers testing' : ''), (err, holder) => {
				if(!err) {
					eventLog(`test system controllers OK ${Object.keys(holder).length.toString().yellow}`)
					moduleLoader(path.join(__dirname, 'controllers/web'), '.controller.js', (log ? 'web controllers testing' : ''), (err, holder) => {
						if(!err) {
							eventLog(`test web controllers OK ${Object.keys(holder).length.toString().yellow}`)
							moduleLoader(path.join(__dirname, 'controllers/repo'), '.controller.js', (log ? 'repo controllers testing' : ''), (err, holder) => {
								if(!err) {
									eventLog(`test repository controllers OK ${Object.keys(holder).length.toString().yellow}`)
								} else {
									throw err
								}
							})
						} else {
							throw err
						}
					})

				} else {
					throw err
				}
			})
		} else {
			throw err
		}
	})
}