import dotenv from 'dotenv'
const env = dotenv.config()
import { filterAndFormatEntries, generateEmails } from './absUtils.js'
import { filterAndFormatGrades, generateGradingEmails, gradingCheck } from './gradesUtils.js'
import { getToken } from './googleAPI.js'
import { getGP, getDFile, getDataGS } from './utils.js'

const SHEET_NAME = process.env.SHEET_NAME
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
    sheetName: SHEET_NAME,
    firstCol: 'A',
    lastCol: SHEET_NAME === 'attendance' ? 'BK' : 'BO'
  })

  const entries = data.reduce(
    SHEET_NAME === 'attendance' ? filterAndFormatEntries : filterAndFormatGrades,
    []
  )
  // check grading examples
  // gradingCheck(entries)
  const emailGenerator = SHEET_NAME === 'attendance' ? generateEmails : generateGradingEmails

  await emailGenerator(entries)

  // check absence examples
  // console.log(entries.at(0), entries.at(-1))
  // console.log(data.length, entries.length)
  // console.log(entries[0])
  // await generateEmails(entries)
  // await generateEmails([entries[0]])
}

main()

// getDataGSTest()
// test
