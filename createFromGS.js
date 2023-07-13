require('dotenv').config()
// const express = require('express')
const {
  getToken,
  getDFile,
  getDataGS,
  getDataGSNew,
  getGP,
  makeRecordLoop,
  makeRecordLoopNew,
  appendLoop,
  appendLoopNew,
  getDataGSTest
} = require('./utils.js')

const gsDate = process.env.GS_DATE || ''
const amas = process.env.AMAS || 'jeremy'

// const app = express()
// const PORT = process.env.PORT
const cohorts = new Set(["2302-ACC-ET-WEB-PT-C", "2302-ACC-ET-WEB-PT-D", "2302-ACC-PT-WEB-PT-C", "2302-ACC-PT-WEB-PT-D", "2302-ACC-PT-WEB-PT-E", "2302-ACC-MT-CYB-PT-A"])
console.log(cohorts)

const main = async () => {
  if (!gsDate) return console.log('No Date!')

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
  else return console.log('NO FILE FOUND!')

  const cybFile = await getDFile(gsDate, false)
  if (cybFile)
    console.log(`
kind: ${cybFile.kind}
id: ${cybFile.id}
name: ${cybFile.name}
`)
  else return console.log('NO CYBER FILE FOUND!')

  // create query object
  const data = [getDataGSNew({
      spreadsheetId: file.id,
      sheetName: "attendanceSheet",
      firstCol: 'A',
      lastCol: 'J'
    }, true, cohorts)]
  // console.log(data)
  data.push(
    getDataGSNew(
      {
        spreadsheetId: cybFile.id,
        sheetName: gsDate.slice(0, gsDate.lastIndexOf('-')),
        firstCol: 'A',
        lastCol: 'I'
      },
      false, cohorts
    )
  )
  // take promises and convert to entries, then flatten
  const entriesArray = await Promise.all(data)
  // console.log(entriesArray)
  const entries = entriesArray.flat(1)

  if (entries.length) console.log('\nFirst List\n', entries[0])
  // let isFirst = true
  // entries.forEach((entry, i, arr) => {
  //   if (i === 0) console.log(entry)
  //   if (entry.cohort === '2302-ACC-MT-CYB-PT-A' && isFirst) console.log(entry), (isFirst = false)
  // })
  await makeRecordLoopNew(entries)

  appendLoopNew(entries, cohorts)
}

main()

// getDataGSTest()
