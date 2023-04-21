require('dotenv').config()
// const express = require('express')
const {
  getToken,
  getDFile,
  getDataGS,
  getGP,
  appendAllRecordCSV,
  makeCsvRecord,
  getDate2
} = require('./utils.js')

const gsDate = process.env.GS_DATE || ''
const amas = process.env.AMAS || 'jeremy'

// const app = express()
// const PORT = process.env.PORT

const main = async () => {
  if (!gsDate) return console.log('No Date!')

  let cohorts = []

  amas === 'jeremy'
    ? (cohorts = ['ET-C', 'ET-D', 'PT-C', 'PT-D', 'PT-E'])
    : amas === 'sam'
    ? (cohorts = ['ET-A', 'ET-B', 'ET-E', 'CT-A', 'CT-B', 'PT-A', 'PT-B'])
    : null

  const token = await getToken()
  const user = await getGP(token)
  // const me = user.emailAddress.slice(0, user.emailAddress.indexOf('@'))
  //console.log(me)

  // grab file and get data - change to desired week's date in env
  console.log('getting file!')

  const file = await getDFile(gsDate)
  if (file)
    console.log(`
kind: ${file.kind}
id: ${file.id}
name: ${file.name}
  `)
  // exit early if no file found
  if (!file) return console.log('NO FILE FOUND!')

  // create query object
  const data = cohorts.map((cohort) =>
    getDataGS({
      spreadsheetId: file.id,
      sheetName: cohort,
      firstCol: 'A',
      lastCol: 'I'
    })
  )
  // take promises and convert to entries, then flatten
  const entriesArray = await Promise.all(data)
  const entries = entriesArray.flat(1)

  // if (entries.length) console.log('\nFirst List\n', entries[0])

  ;(await makeCsvRecord({ data: entries[0] }))
    ? console.log('writing allRecords import file successful!')
    : console.log('allRecords aready existed')
  ;(await makeCsvRecord({
    classDay: 'class1',
    data: { sName: 'sName', c1Status: 'c1Status', date: 'date', cohort: 'cohort' }
  }))
    ? console.log('writing c1 import file successful!')
    : console.log('c1 aready existed')
  ;(await makeCsvRecord({
    classDay: 'class2',
    data: { sName: 'sName', c2Status: 'c2Status', date: 'date', cohort: 'cohort' }
  }))
    ? console.log('writing c2 import file successful!')
    : console.log('c2 aready existed')

  entries.forEach(async (entry) => {
    const c1 = gsDate
    const c2 = getDate2(gsDate)

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
    const c1Match = c1s !== 'Attended' && c1s !== 'No Status'
    const c2Match = c2s !== 'Attended' && c2s !== 'No Status'

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

    ;(await appendAllRecordCSV({ data: entry }))
      ? console.log('Finished appending to allRecords')
      : console.log(`entry of ${entry['Student Name']} failed to be appended`)
  })
}

main()
