const { google } = require('googleapis')
const { writeFileSync, statSync, readFileSync, appendFileSync, existsSync } = require('fs')
const { readFile } = require('fs').promises
const crypto = require('node:crypto')

const gsDate = process.env.GS_DATE

// Google helper
const getConfig = (method, token) => {
  return {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
}

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
)

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN })

// google helpers
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
        'Content-Type': 'application/json'
      }
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

const getDFile = async (date) => {
  const svcDrive = google.drive({ version: 'v3', auth: oAuth2Client })
  try {
    const {
      data: {
        files: [file]
      }
    } = await svcDrive.files.list({
      q: `name contains 'U-Att-${date}'`,
      spaces: 'drive'
    })

    return file ? file : console.log('No file!')
  } catch (error) {
    console.error(error)
  }
}

const getDataGS = async (ssQuery) => {
  // console.log(ssQuery)

  const { spreadsheetId, sheetName, firstCol, lastCol } = ssQuery

  const svcSheets = google.sheets({ version: 'v4', auth: oAuth2Client })
  const range = `${sheetName}!${firstCol}:${lastCol}`

  const {
    data: { values }
  } = await svcSheets.spreadsheets.values.get({
    spreadsheetId,
    range
  })

  let valuesLength = 0

  //create entries, skip blanks

  const entries = values.reduce((a, c, i) => {
    const keys = values[0]
    if (i === 0 || !c[0]) return a

    const cohort = sheetName
      .split('-')
      .map((seg, j) => (j == 0 ? `2302-ACC-${seg}` : `-WEB-PT-${seg}`))
      .join('')
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

// createFromGS.js
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

// createFromGS.js
const appendAllRecordCSV = async ({ classDay, data }) => {
  const filePath = `${classDay ? 'classes' : 'allRecords'}-${gsDate}.csv`

  const dataStr = Object.values(data).join(',') + '\n'

  //get current file data
  // const one = await checkFileAsync(filePath)
  const oneHash = generateHash(await checkFileAsync(filePath))

  //append data
  await appending(filePath, dataStr)

  //get file data after append
  // const two = await checkFileAsync(filePath)
  const twoHash = generateHash(await checkFileAsync(filePath))

  // return the comparison of hashes
  return oneHash !== twoHash
}

module.exports = {
  getConfig,
  getToken,
  getGP,
  getDFile,
  getDataGS,
  appendAllRecordCSV,
  makeCsvRecord
}
