require('dotenv').config()
const { google } = require('googleapis')
const { writeFileSync, appendFileSync } = require('fs')
const { readFile } = require('fs').promises
const {
	getToken,
	getGP,
	// getDataGSTest
} = require('./utils.js')

const oAuth2Client = new google.auth.OAuth2(
	process.env.CLIENT_ID,
	process.env.CLIENT_SECRET,
	process.env.REDIRECT_URI
)

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN })

const newKeyNames = {
	ospc1a: 'pre1',
	ospc1b: 'post1',
	ospc2a: 'pre2',
	ospc2b: 'post2',
	ospT: 'tue',
	ospF: 'fri',
}

let nameCheck = ''

const getFile = async () => {
	const svcDrive = google.drive({ version: 'v3', auth: oAuth2Client })
	try {
		const searchString = 'March-May'
		const {
			data: {
				files: [file],
			},
		} = await svcDrive.files.list({
			q: `name contains '${searchString}'`,
			spaces: 'drive',
		})

		return file ? file : console.log('No file!')
	} catch (error) {
		console.error(error.response.status)
		console.error(error.response.statusText)
	}
}

const getDataGS = async (ssQuery) => {
	// console.log(ssQuery)

	const { spreadsheetId, sheetName, firstCol, lastCol } = ssQuery

	const svcSheets = google.sheets({ version: 'v4', auth: oAuth2Client })
	const range = `${sheetName}!${firstCol}:${lastCol}`

	const {
		data: { values },
	} = await svcSheets.spreadsheets.values.get({
		spreadsheetId,
		range,
	})

	let valuesLength = 0

	//create entries, skip blanks

	const entries = values.reduce((acc, curr, i) => {
		const keys = values[0]
		if (i === 0 || !curr[0]) return acc
		const entry = {}
		keys.forEach((key, idx) => (entry[key] = curr[idx]))
		acc.push(entry)
		valuesLength++
		return acc
	}, [])

	if (valuesLength) console.log(`got ${valuesLength} values!`)

	return entries.length
		? (console.log(`got ${entries.length} entries!`), entries)
		: (console.log('no entries to send along!'), [])
}

const handleError = (e) => {
	console.error('CSV file has not been created!\n', e)
}

const checkFileAsync = async (filePath) => {
	try {
		const data = await readFile(filePath, 'utf8', { flags: 'rx' })
		return data
	} catch (error) {
		if (error.code === 'ENOENT') {
			console.error('File not found')
		}
		// console.error('Error reading file: ', error)
	}
}

const makeCsvRecord = async () => {
	const filePath = `./attendanceOSP.csv`
	const headers = 'name,cohort,pre1,post1,pre2,post2,tue,fri,total\n'

	const fileTest = await checkFileAsync(filePath)
	if (!fileTest) {
		console.log('Writing New File')
		writeFileSync(filePath, headers, handleError)
	}
	console.log('Checking if new file exists...')
	const fileTestTwo = await checkFileAsync(filePath)
	fileTestTwo ? console.log('CSV found: ', true) : console.log('CSV found: ', false)

	return fileTestTwo
}

const reduceSort = (acc, curr, i, arr) => {
	const { sName, cohort } = curr
	const newEntry = {
		name: sName,
		cohort: cohort ? cohort : 'notYet',
		pre1: 0,
		post1: 0,
		pre2: 0,
		post2: 0,
		tue: 0,
		fri: 0,
		total: 0,
	}
	acc[sName] ??= newEntry

	const checkAtt = (tuple) => {
		const [key, val] = tuple
		// if (i === 0) console.log('checkAtt', val == 'Attended')
		return val == 'Attended' ? true : false
	}

	const tupleCheck = (tuple) => {
		const [key, val] = tuple
		const newKey = newKeyNames[key]
		// if (i === 0) {
		// 	console.log(tuple, acc[sName][newKey], key, newKey, key in newKeyNames)
		// }
		key in newKeyNames && checkAtt(tuple) ? acc[sName][newKey]++ : null
	}

	const currEntries = Object.entries(curr)
	// if (i === 0) console.log('in Reduce', i, acc[sName])
	currEntries.forEach(tupleCheck)
	// if (i === 0) console.log('in Reduce', i, acc[sName])

	let newTotal = 0
	Object.values(newKeyNames).forEach((key) => {
		newTotal += acc[sName][key]
	})
	acc[sName].total = newTotal
	return acc
}

const appending = (path, data) => {
	// if (Number.isNaN(data.undefined)) delete data.undefined
	const dataStr = Object.values(data).join(',') + '\n'
	appendFileSync(path, dataStr)
}

const main = async () => {
	const token = await getToken()
	const user = await getGP(token)
	// const me = user.emailAddress.slice(0, user.emailAddress.indexOf('@'))
	// console.log(me)

	const sheetNames = ['4-3', '4-10', '4-17', '4-24', '5-1', '5-8']

	console.log('getting file!')

	const file = await getFile()
	if (file)
		console.log(`
kind: ${file.kind}
id: ${file.id}
name: ${file.name}
  `)

	const data = sheetNames.map((sheet) =>
		getDataGS({
			spreadsheetId: file.id,
			sheetName: sheet,
			firstCol: 'A',
			lastCol: 'J',
		})
	)
	const entriesArray = (await Promise.all(data)).flat(1)
	// console.log(entriesArray)
	const sortedObject = entriesArray.reduce(reduceSort, {})
	// console.log(sortedObject)
	const objKeys = Object.keys(sortedObject)
	console.log(objKeys.length)
	await makeCsvRecord()
	objKeys.forEach((key) => {
		// console.log('adding ', sortedObject[key])
		appending(`./attendanceOSP.csv`, sortedObject[key])
	})
}
main()
