import csv2json from 'csvtojson'
import { exec } from 'child_process'
import { promisify } from 'util'

// create promise-wrap
const execPromise = promisify(exec)

// get files and filename
const { stdout: rawFiles } = await execPromise(`ls`)
const files = rawFiles.split(`\n`).slice(0, -1)
const filename = `absents-${Date().split(' ').slice(1, 4).join('-')}.csv`

//get dates and date CBs
const convertNumCB = (str) => Number(str)
const dateReduceCB = (dStr, d, i) => (!i ? (dStr += d) : (dStr += `/${Number(d) + 3}`))
const date1Map = (date) => date.map(convertNumCB).join('/')
const date2Reduce = (date) => date.reduce(dateReduceCB, '')

//append record helpers
const checkRecord = (classDay) => classDay !== 'Attended' && classDay !== 'No Status'
const appendRecord = (str) =>
  execPromise(`echo '${str}' >> ${filename}`)
    .then((result) => console.log(`added ${result}`))
    .catch((err) => console.error(err))
const appendRecordProc = ({ classDay, str }) =>
  checkRecord(classDay) ? (appendRecord(str), true) : false

// simplifying comparitors by helpers
const findExtension = (file) => file.slice(file.indexOf('.')) === '.csv'
const matchFileName = (file) => file.slice(0, 5) === 'U-Att'
const matchExtAndName = (file) => findExtension(file) && matchFileName(file)

// create loop for appending
const appendLoop = (contents, file) => {
  let contentCount = 0
  const rawDate = file.slice(6, 10).split('-')
  contents.forEach((content) => {
    let sn = content.sName.replace(/'/g, '_')
    appendRecordProc({
      classDay: content.class1,
      class1: `${sn},${content.class1},${date1Map(rawDate)}`
    })
    appendRecordProc({
      classDay: content.class2,
      class2: `${sn},${content.class2},${date2Reduce(rawDate)}`
    })
    contentCount++
  })
  console.log(`looped ${contentCount} records`)
  return contentCount
}

const ifMatchAppend = (file) =>
  !matchExtAndName(file)
    ? false
    : csv2json()
        .fromFile(`${file}`)
        .then((contents) => appendLoop(contents, file))

// loop for matching files
const findFileAndLoop = (files) => {
  let totalFiles = 0
  let matchedFiles = 0
  files.forEach((file) => (totalFiles++, ifMatchAppend(file) ? matchedFiles++ : null))
  return [totalFiles, matchedFiles]
}

// create file and add header
await execPromise(`touch ${filename}`)
await execPromise(`echo 'sName,status,date' >> ${filename}`)

// run loops and appending
const [total, matched] = findFileAndLoop(files)
console.log(total, matched)
