exports.start = () => {
	runServiceOnAllUserDb({
		filter: {},
		serviceFunc: (dbModel, cb) => { updateDbStats(dbModel, cb) },
		name: 'dbStats',
		repeatInterval: 60000
		// repeatInterval:config.repeatInterval || 60000
	})

}

function updateDbStats(dbModel, cb) {
	try {
		dbModel.conn.db.stats((err, statsObj) => {
			if(dberr(err, cb)) {
				statsObj.dataSizeKb = Number(statsObj.dataSize / 1024).round(2)
				statsObj.dataSizeMb = Number(statsObj.dataSize / (1024 * 1024)).round(2)
				statsObj.dataSizeGb = Number(statsObj.dataSize / (1024 * 1024 * 1024)).round(2)
				statsObj.dataSizeText = `${statsObj.dataSize.toString()} Byte`
				if(statsObj.dataSizeGb > 1) {
					statsObj.dataSizeText = `${statsObj.dataSizeGb} GB`
				} else if(statsObj.dataSizeMb > 1) {
					statsObj.dataSizeText = `${statsObj.dataSizeMb} MB`
				} else if(statsObj.dataSizeKb > 1) {
					statsObj.dataSizeText = `${statsObj.dataSizeKb} KB`
				}
				db.dbdefines.findOne({_id:dbModel._id},(err,doc)=>{
					if(dberr(err,cb)){
						if(dbnull(doc,cb)){
							doc.dbStats=statsObj
							doc.save((err)=>{
								cb(err)	
							})
						}
					}
				})
			}
		})

	} catch (tryErr) {
		errorLog(`tryErr:`, tryErr)
		cb()
	}
}
