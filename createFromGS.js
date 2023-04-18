require('dotenv').config()
// const express = require('express')
const {
  getToken,
  getDFile,
  getDataGS,
  getGP,
  appendAllRecordCSV,
  makeCsvRecord
} = require('./utils.js')

const gsDate = process.env.GS_DATE || ''
const amas = process.env.AMAS || 'jeremy'

// const app = express()
// const PORT = process.env.PORT

const main = async () => {
  if (!gsDate) return console.log('No Date!')

  let cohorts = []
  if (amas === 'jeremy') {
    cohorts = ['ET-C', 'ET-D', 'PT-C', 'PT-D', 'PT-E']
  }
  if (amas === 'sam') {
    cohorts = ['ET-A', 'ET-B', 'ET-E', 'CT-A', 'CT-B', 'PT-A', 'PT-B']
  }

  const token = await getToken()
  const user = await getGP(token)
  const me = user.emailAddress.slice(0, user.emailAddress.indexOf('@'))
  //console.log(me)

  // grab file and get data - change to desired week's date
  console.log('getting file!')

  const file = await getDFile(gsDate)
  if (file)
    console.log(`
kind: ${file.kind}
id: ${file.id}
name: ${file.name}
  `)
  if (!file) return console.log('NO FILE FOUND!')

  // create query object
  const data = cohorts.map(async (cohort) => {
    const ssQuery = {
      spreadsheetId: file.id,
      sheetName: cohort,
      firstCol: 'A',
      lastCol: 'I'
    }
    const promises = getDataGS(ssQuery)
    return promises
  })
  // console.log(data)
  const entriesArray = await Promise.all(data)
  const entries = entriesArray.flat(1)
  if (entries.length) console.log('\nFirst List\n', entries[0])

  const allRecords = await makeCsvRecord({ data: entries[0] })
  allRecords
    ? console.log('writing allRecords import file successful!')
    : console.log('allRecords aready existed')

  const class1 = await makeCsvRecord({
    classDay: 'class1',
    data: { sName: 'sName', c1Status: 'c1Status', date: 'date', cohort: 'cohort' }
  })
  class1 ? console.log('writing c1 import file successful!') : console.log('c1 aready existed')

  const class2 = await makeCsvRecord({
    classDay: 'class2',
    data: { sName: 'sName', c2Status: 'c2Status', date: 'date', cohort: 'cohort' }
  })
  class2 ? console.log('writing c2 import file successful!') : console.log('c2 aready existed')

  entries.forEach(async (entry) => {
    const c1 = gsDate
    const c2 = gsDate
      .split('-')
      .map((n, i) => (i == 1 ? Number(n) + 3 : Number(n)))
      .join('-')

    const {
      cohort,
      'Student Name': sName,
      Class1: c1s,
      Class2: c2s,
      OSPC1A,
      OSPC2A,
      OSPC1B,
      OSPC2B,
      OSPT,
      OSPF
    } = entry

    const absRecC1 = {
      sName,
      c1Status: c1s,
      date: c1,
      cohort
    }
    const absRecC2 = {
      sName,
      c2Status: c2s,
      date: c2,
      cohort
    }

    if (c1s !== 'Attended' && c1s !== 'No Status') {
      const check = await appendAllRecordCSV({ classDay: 'class1', data: absRecC1 })

      check ? console.log('Appended class 1 records') : console.log('did not append')
    }

    if (c2s !== 'Attended' && c2s !== 'No Status') {
      const check = await appendAllRecordCSV({ classDay: 'class2', data: absRecC2 })

      check ? console.log('Appended class 2 records') : console.log('did not append')
    }

    const checkAll = await appendAllRecordCSV({ data: entry })
    checkAll
      ? console.log('Finished appending to allRecords')
      : console.log(`entry of ${entry['Student Name']} failed to be appended`)
  })
}

main()

//Draft Object
// {
//   "id": string,
//   "message": {
//     object (Message)
//   }
// }

// Message object
// {
//   "id": string,
//   "threadId": string,
//   "labelIds": [
//     string
//   ],
//   "snippet": string,
//   "historyId": string,
//   "internalDate": string,
//   "payload": {
//     object (MessagePart)
//   },
//   "sizeEstimate": integer,
//   "raw": string
// }
