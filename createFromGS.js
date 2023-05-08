require('dotenv').config()
// const express = require('express')
const {
  getToken,
  getDFile,
  getDataGS,
  getGP,
  makeRecordLoop,
  appendLoop,
  // getDataGSTest
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

  const cybFile = await getDFile(gsDate, false)
  if (cybFile)
    console.log(`
kind: ${cybFile.kind}
id: ${cybFile.id}
name: ${cybFile.name}
`)
  if (!cybFile) return console.log('NO CYBER FILE FOUND!')

  // create query object
  const data = cohorts.map((cohort) =>
    getDataGS({
      spreadsheetId: file.id,
      sheetName: cohort,
      firstCol: 'A',
      lastCol: 'I'
    })
  )
  data.push(
    getDataGS(
      {
        spreadsheetId: cybFile.id,
        sheetName: gsDate.slice(0, gsDate.lastIndexOf('-')),
        firstCol: 'A',
        lastCol: 'I'
      },
      false
    )
  )
  // take promises and convert to entries, then flatten
  const entriesArray = await Promise.all(data)
  const entries = entriesArray.flat(1)

  // if (entries.length) console.log('\nFirst List\n', entries[0])

  await makeRecordLoop(entries)

  appendLoop(entries)
}

main()

// getDataGSTest()
