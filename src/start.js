global.__root = __dirname
require('./lib/initialize-app')(() => {
	require('./app')()
})


// var YAML=require('yaml')
// let deneme=fs.readFileSync('./deneme.yml', 'utf8')

// let a=YAML.parse(deneme)
// console.log(a)

//fs.writeFileSync('./deneme.json',JSON.stringify(a,null,2),'utf8')


