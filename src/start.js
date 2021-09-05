global.__root=__dirname
require('./lib/initialize-app')

var start=require('./app')

appInfo()

start()


