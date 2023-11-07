import {
  getToken,
  getGP,
  getDFile,
  getDataGS,
  filterAndFormatEntries,
  generateEmails
} from './utils.js'

const main = async () => {
  const token = await getToken()
  const user = await getGP(token)
  // const me = user.emailAddress.slice(0, user.emailAddress.indexOf('@'))
  //console.log(me)

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
    sheetName: 'attendance',
    firstCol: 'A',
    lastCol: 'BK'
  })

  const entries = data.reduce(filterAndFormatEntries, [])
  console.log(entries.at(0), entries.at(-1))
  // console.log(data.length, entries.length)
  // console.log(entries[0])
  await generateEmails(entries)
  // await generateEmails([entries[0]])
}

main()

// getDataGSTest()
// test
