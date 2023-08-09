require('dotenv').config()
// const express = require('express')
const {
  getToken,
  getGP,
  getDFile,
  getDataGS,
  filterAndFormatEntries,
  generateEmails
} = require('./utils.js')

const main = async () => {
  const token = await getToken()
  const user = await getGP(token)
  // const me = user.emailAddress.slice(0, user.emailAddress.indexOf('@'))
  //console.log(me)

  // grab file and get data - change to desired week's date in env
  console.log('getting file!')

  const file = await getDFile()
  if (file)
    console.log(`
  kind: ${file.kind}
  id: ${file.id}
  name: ${file.name}
    `)
  // exit early if no file found
  else return console.log('NO FILE FOUND!')

  // create query object
  const data = await getDataGS({
    spreadsheetId: file.id,
    sheetName: 'attendanceSheet',
    firstCol: 'A',
    lastCol: 'BI'
  })

  const entries = data.reduce(filterAndFormatEntries, [])
  console.log(data.length, entries.length)
  console.log(entries[0])
  await generateEmails(entries)
}

main()

// getDataGSTest()
