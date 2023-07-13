const { google } = require('googleapis')
const { writeFileSync, appendFileSync } = require('fs')
const { readFile } = require('fs').promises
const crypto = require('node:crypto')

const gsDate = process.env.GS_DATE

const oAuth2Client = new google.auth.OAuth2(
	process.env.CLIENT_ID,
	process.env.CLIENT_SECRET,
	process.env.REDIRECT_URI
)

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN })

// google helpers
const getConfig = (method, token) => {
	return {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	}
}

const getToken = async () => {
	const { token } = await oAuth2Client.getAccessToken()
	// console.log(token)
	return token
}

const getGP = async (token) => {
	try {
		const url = 'https://gmail.googleapis.com/gmail/v1/users/me/profile'

		const res = await fetch(url, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		})
		if (res.status > 200) {
			throw console.error(`${res.status}: ${res.statusText}`)
		}
		if (res.ok) {
			const pdata = await res.json()
			if (pdata.error) {
				throw console.error(pdata.error)
			}
			return pdata
		}
	} catch (error) {
		console.error(error)
	}
}

const getDFile = async (date, isWeb = true) => {
	const svcDrive = google.drive({ version: 'v3', auth: oAuth2Client })
	try {
		const searchString = isWeb ? `U-ATT-${date}` : '2302-ACC-MT-CYB-PT-A'
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
		console.error(error)
	}
}

const getDataGSNew = async (ssQuery, isWeb = true, cohorts) => {
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

	const entries = values.reduce((a, c, i) => {
		const keys = values[0]
		if (i === 0 || !c[0]) return a

		const cohort = !isWeb ? '2302-ACC-MT-CYB-PT-A' : null
		const entry = { cohort }
		keys.forEach((key, idx) => (entry[key] = c[idx]))

		a.push(entry)
		valuesLength++
		return a
	}, [])
	if (valuesLength) console.log(`got ${valuesLength} values!`)

	return entries.length
		? (console.log(`got ${entries.length} entries!`), entries)
		: (console.log('no entries to send along!'), [])
}

// helpers
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
const appending = async (path, data) => {
	appendFileSync(path, data)
}
const handleError = (e) => {
	console.error('CSV file has not been created!\n', e)
}
const generateHash = (str) => {
	return crypto.createHash('md5').update(str).digest('hex')
}

const makeCsvRecord = async ({ classDay, data }) => {
	const filePath = `${classDay ? 'classes' : 'allRecords'}-${gsDate}.csv`
	const headers = classDay ? 'sName,status,date,cohort\n' : `${Object.keys(data).join(',')}\n`

	const fileTest = await checkFileAsync(filePath)
	if (!fileTest) {
		console.log('Writing New File')
		writeFileSync(filePath, headers, handleError)
	}
	console.log('Checking if new file exists...')
	const fileTestTwo = await checkFileAsync(filePath)
	fileTestTwo ? console.log(true) : console.log(false)

	return fileTestTwo
}

const makeRecordLoopNew = async (entries) => {
	;(await makeCsvRecord({
		classDay: 'class1',
		data: { sName: 'sName', c1Status: 'c1Status', date: 'date', cohort: 'cohort' },
	}))
		? console.log('writing c1 import file successful!')
		: console.log('c1 aready existed')
	;(await makeCsvRecord({
		classDay: 'class2',
		data: { sName: 'sName', c2Status: 'c2Status', date: 'date', cohort: 'cohort' },
	}))
		? console.log('writing c2 import file successful!')
		: console.log('c2 aready existed')
}

// createFromGS.js append records
const appendAllRecordCSV = async ({ classDay, data }) => {
	const filePath = `${classDay ? 'classes' : 'allRecords'}-${gsDate}.csv`
	const dataStr = Object.values(data).join(',') + '\n'
	//get current file data
	const oneHash = generateHash(await checkFileAsync(filePath))
	//append data
	await appending(filePath, dataStr)
	//get file data after append
	const twoHash = generateHash(await checkFileAsync(filePath))
	// return the comparison of hashes
	return oneHash !== twoHash
}

// appending loop below
const dateMapCB = (n, i) => (i == 1 ? Number(n) + 3 : Number(n))
const getDate2 = (date) => date.split('-').map(dateMapCB).join('-')

const appendLoopNew = async (entries, cohorts) => {
	console.log('about to append')
	entries.forEach(async (entry, i) => {
		//exit loop early if not in cohort list
		if (i == entries.length - 1) console.log('Ending Appending')
		if (!cohorts.has(entry.cohort)) return
		const c1 = gsDate
		const c2 = getDate2(gsDate)

		const { cohort, sName, class1: c1s, class2: c2s } = entry
		const absRecC1 = {
			sName,
			c1Status: c1s,
			date: c1,
			cohort,
		}
		const absRecC2 = {
			sName,
			c2Status: c2s,
			date: c2,
			cohort,
		}

		const c1Match = c1s !== 'Attended' && c1s !== 'No Status' && c1s !== ''
		const c2Match = c2s !== 'Attended' && c2s !== 'No Status' && c2s !== ''
		if (c1Match) {
			;(await appendAllRecordCSV({ classDay: 'class1', data: absRecC1 }))
				? console.log('Appended class 1 records')
				: console.log('did not append')
		}
		if (c2Match) {
			;(await appendAllRecordCSV({ classDay: 'class2', data: absRecC2 }))
				? console.log('Appended class 2 records')
				: console.log('did not append')
		}
	})
}

// Testing for cyber only
async function getDataGSTest() {
	const cybFile = await getDFile(gsDate, false)
	if (cybFile)
		console.log(`
kind: ${cybFile.kind}
id: ${cybFile.id}
name: ${cybFile.name}
`)
	if (!cybFile) return console.log('NO CYBER FILE FOUND!')
	const date = gsDate.slice(0, gsDate.lastIndexOf('-'))
	const testPromise = getDataGS(
		{
			spreadsheetId: cybFile.id,
			sheetName: date,
			firstCol: 'A',
			lastCol: 'I',
		},
		false
	)
	console.log(testPromise)
	const testEntry = await Promise.all([testPromise])
	const entries = testEntry.flat(1)

	console.log(entries)
	await makeRecordLoop(entries)
	appendLoop(entries)
}

module.exports = {
	getConfig,
	getToken,
	getGP,
	getDFile,
	getDataGSNew,
	appendAllRecordCSV,
	makeCsvRecord,
	getDate2,
	appendLoopNew,
	makeRecordLoopNew,
	getDataGSTest,
}
