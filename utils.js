const { google } = require('googleapis')

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
)

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN })

const svcSheets = google.sheets({ version: 'v4', auth: oAuth2Client })
const svcDrive = google.drive({ version: 'v3', auth: oAuth2Client })
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

// google helpers
const getConfig = (method, token) => {
  return {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
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

const getDFile = async () => {
  try {
    const searchString = '2302-full-attendance'
    const {
      data: {
        files: [file]
      }
    } = await svcDrive.files.list({
      q: `name contains '${searchString}'`,
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
    const entry = {}
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

const filterAndFormatEntries = (listOfEntries, entry) => {
  const isWithdrawn = entry.isXferToAug || entry.isWithdrawn
  if (!isWithdrawn) {
    // console.log(entry.sName)
    const newObj = {
      sName: entry.sName,
      email: entry.emails,
      cohort: entry.cohort,
      absences: isNaN(Number(entry.absencePlusPartial)) ? 0 : Number(entry.absencePlusPartial),
      excusedCount: isNaN(Number(entry.excusedAbsences)) ? 0 : Number(entry.excusedAbsences),
      attended: [],
      absent: [],
      partial: [],
      excused: []
    }
    for (const key in entry) {
      if (key.indexOf('/') > 0 && Date.parse(key) < Date.now()) {
        if (entry[key] === 'Attended') newObj.attended.push(key)
        if (entry[key] === 'Absent') newObj.absent.push(key)
        if (entry[key] === 'Partial') newObj.partial.push(key)
        if (entry[key] === 'Excused') newObj.excused.push(key)
      }
    }
    listOfEntries.push(newObj)
  }
  return listOfEntries
}
//, entry[]

const createDraft = async (raw, gmail) => {
  try {
    const res = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: { message: { raw } }
    })
    console.log(`Draft created with ID: ${res.data.id}`)
  } catch ({ errors }) {
    errors.forEach((err) =>
      console.error('Error creating draft:', err.message, err.domain, err.reason)
    )
  }
}

const generateEmails = async (entries) => {
  const domain = '@fullstackacademy.com'
  const itmEmails = {
    '2302-ACC-ET-WEB-PT-A': `<>, <michael.pascuzzi${domain}>, <Frank.Chambergo${domain}>, <Thomas.Pollick${domain}>`,
    '2302-ACC-ET-WEB-PT-B': `<charles.lucas${domain}>, <Aiesha.Brown${domain}>, <Woody.lucas${domain}>`,
    '2302-ACC-ET-WEB-PT-C': `<jeffrey.yen${domain}>, <shaquon.kelley${domain}>, <joey.pedicini${domain}>`,
    '2302-ACC-ET-WEB-PT-D': `<bianca.dennis${domain}>, <philip.lemaster${domain}>, <Phillip.Shim${domain}>`,
    '2302-ACC-ET-WEB-PT-E': `<tony.shaker${domain}>, <Abi.scholz${domain}>, <Jing.cao${domain}>`,
    '2302-ACC-CT-WEB-PT-A': `<Aaron.shen${domain}>, <Gonca.ay${domain}, <Kemp.atkinson${domain}>`,
    '2302-ACC-CT-WEB-PT-B': `<jacqueline.levine${domain}>, <Caitlin.lamprecht${domain}>, <Elijah.hensel${domain}>`,
    '2302-ACC-PT-WEB-PT-A': `<John.sickels${domain}>, <Abidur.dipta${domain}>, <Jonathan.martinez${domain}>`,
    '2302-ACC-PT-WEB-PT-B': `<Aaron.katz${domain}>, <Danielle.williams${domain}, <David.boicourt${domain}>`,
    '2302-ACC-PT-WEB-PT-C': `<kelsey.schroeder${domain}>, <Esteban.Ordonez-Benavides${domain}>, <shelby.robinson${domain}>`,
    '2302-ACC-PT-WEB-PT-D': `<Alia.Abdulahi${domain}>, <Xavier.LoeraFlores${domain}>, <Tyler.Lemke${domain}>`,
    '2302-ACC-PT-WEB-PT-E': `<david.liang${domain}>, <ronnie.rios${domain}>, <wallie.raihan${domain}>`
  }
  const itmList = {
    '2302-ACC-ET-WEB-PT-A': 'Sam, Michael, Frank, or Thomas',
    '2302-ACC-ET-WEB-PT-B': 'Sam, Chuck, Aiesha, or Woody',
    '2302-ACC-ET-WEB-PT-C': 'Jeff, Shaquon, or Joey',
    '2302-ACC-ET-WEB-PT-D': 'Bianca, Philip, or Phillip',
    '2302-ACC-ET-WEB-PT-E': 'Sam, Tony, Abi, or Jing',
    '2302-ACC-CT-WEB-PT-A': 'Sam, Aaron, Gonca, or Kemp',
    '2302-ACC-CT-WEB-PT-B': 'Sam, Jackie, Caitlin, or Elijah',
    '2302-ACC-PT-WEB-PT-A': 'Sam, John, Abidur, or Jonathan',
    '2302-ACC-PT-WEB-PT-B': 'Sam, Aaron, Danielle, or David',
    '2302-ACC-PT-WEB-PT-C': 'Kelsey, Esteban, or Shelby',
    '2302-ACC-PT-WEB-PT-D': 'Tyler, Alia, or Xavier',
    '2302-ACC-PT-WEB-PT-E': 'David, Wayel, or Ronnie'
  }

  const absenceWords = [
    'offset',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten'
  ]

  let emails = 0
  let overAbsenceTest = undefined
  let normalAbsenceTest = undefined

  for (const entry of entries) {
    const len = entry.absent.length
    const tenDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 10
    const lastAbsence = Date.parse(entry.absent[len - 1])
    if (!entry.absences || isNaN(lastAbsence)) continue
    // console.log('qualifies - has absences')
    const { sName, email, cohort, absences, excusedCount, attended, absent, partial, excused } =
      entry

    const absenceRem = 10 - absences
    const isRecent = !(lastAbsence < tenDaysAgo)
    const isOverAbsences = absenceRem < 0
    if (isOverAbsences) {
      // console.log(`creating overAbsences email to ${sName}`)
      // console.log(absences)
      // console.log(absent.at(-1))
      // over absences allottment
      const message = [
        'Content-Type: text/plain; charset="UTF-8"\n',
        'MIME-Version: 1.0\n',
        'Content-Transfer-Encoding: 7bit\n',
        `to: <${email}>\n`,
        `cc: ${itmEmails[cohort]}\n`,
        `from: "Jeremy Rogers" <jeremy.rogers@fullstackacademy.com>\n`,
        `subject: FSA x ACC - Web Dev - Absences Exceeded [[ACTION REQUIRED]]\n\n`,
        `Hello ${sName},\n\nI hope you're doing well. I noticed that you've been out out these dates${absent.join(
          '\n'
        )}.\n\n${
          partial.length ? 'You also have parial days of ' + partial.join(', ') + '\n\n' : ''
        }Please be aware you have exceeded your allotted absences and partials and may be withdrawn under the rules of the SEA you signed and the various times it's been mentioned during the course.\n\nIf you feel any of these absences are incorrect, please contact me to make the appropriate corrections. Thank you!\n\nHope to hear back soon!`
      ].join('')
      if (!overAbsenceTest) overAbsenceTest = '-------\n\n' + message
      const raw = Buffer.from(message).toString('base64')
      // await createDraft(raw, gmail)
      emails++
      // console.log(`isOverAbsences email to ${sName} created`)
    } else if (isRecent) {
      // console.log(`creating normal absences email to ${sName}`)
      // console.log(absences, absent.at(-1))
      // normal message about absences
      const message = [
        'Content-Type: text/plain; charset="UTF-8"\n',
        'MIME-Version: 1.0\n',
        'Content-Transfer-Encoding: 7bit\n',
        `to: <${email}>\n`,
        `cc: ${itmEmails[cohort]}\n`,
        `from: "Jeremy Rogers" <jeremy.rogers@fullstackacademy.com>\n`,
        `subject: FSA x ACC - Web Dev - ${absenceWords[absences]} or More Absences\n\n`,
        `Hello ${sName},\n\nI hope you're doing well. I noticed that you were out ${absent.join(
          ', '
        )}.\n\n${
          partial.length ? 'You also have parial days of ' + partial.join(', ') + '\n\n' : ''
        }Please let your instructional team know if you need extra assistance in regard to catching up or feeling comfortable with any concepts you might feel shaky on.\n\nPlease be aware you have ${absenceRem} left.\n\nDon't hesitate to reply back any time to me, ${
          itmList[cohort]
        }.\n\nWe're here to support you to the best of our ability. Please use us as a resource! 🙂\n\nHope to hear back soon!`
      ].join('')
      if (!normalAbsenceTest) normalAbsenceTest = '-------\n\n' + message
      const raw = Buffer.from(message).toString('base64')
      // await createDraft(raw, gmail)
      emails++
      // console.log(`Normal Absence email to ${sName} created`)
    }
  }
  console.log(`generating ${emails} emails`)
  console.log(overAbsenceTest ? overAbsenceTest : undefined)
  console.log(normalAbsenceTest ? normalAbsenceTest : undefined)
}

// helpers

module.exports = {
  getConfig,
  getToken,
  getGP,
  getDFile,
  getDataGS,
  filterAndFormatEntries,
  generateEmails
}
