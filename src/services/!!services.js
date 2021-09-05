
exports.tasks=require('./tasks/tasks')
exports.programs=require('./programs/programs')

exports.start=(cb)=>{

	exports.tasks.run()
	
	if(cb)
		cb()
	
}
