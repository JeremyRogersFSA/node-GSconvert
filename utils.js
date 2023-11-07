import dotenv from 'dotenv'
const env = dotenv.config()
import { google } from 'googleapis'

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

export const getToken = async () => {
  const { token } = await oAuth2Client.getAccessToken()
  console.log(token)
  return token
}

export const getGP = async (token) => {
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

export const getDFile = async () => {
  try {
    const searchString = '2308 acc datasheet'
    const {
      data: {
        files: [file]
      }
    } = await svcDrive.files.list({
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      q: `name contains '${searchString}'`,
      // spaces: 'drive'
      corpora: 'allDrives'
    })

    return file ? file : console.log('No file!')
  } catch (error) {
    console.error(error)
  }
}

export const getDataGS = async (ssQuery) => {
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
  // entries.forEach((entry) => console.log(entry.name))
  // entries.length ? console.log(entries[0]) : null
  return entries.length
    ? (console.log(`got ${entries.length} entries!`), entries)
    : (console.log('no entries to send along!'), [])
}

export const filterAndFormatEntries = (listOfEntries, entry) => {
  const isWithdrawn = entry.withdrawn === 'TRUE'
  if (!isWithdrawn) {
    entry.withdrawn = false
    const abs = Number(entry.absences)
    const ex = Number(entry.excused)
    const [last, first] = entry.name.split(', ')
    entry.firstLast = `${first} ${last}`
    // console.log(entry.sName)
    const newObj = {
      name: entry.name,
      firstLast: entry.firstLast,
      email: entry.email,
      cohort: '2308-' + entry.cohort,
      absences: isNaN(abs) ? 0 : abs,
      excuses: isNaN(ex) ? 0 : ex,
      attended: [],
      absent: [],
      partial: [],
      excused: []
    }
    for (const key in entry) {
      if (key.indexOf('-') === 2) {
        // if (entry[key] === '') continue
        const month = Number(key.split('-')[0])
        const key2024 = month < 5
        const dateAndYear = key2024 ? key + '-2024' : key + '-2023'
        // console.log(key2024, dateAndYear, month)
        if (new Date(dateAndYear) > Date.now()) continue
        if (entry[key] === 'Present') newObj.attended.push(dateAndYear)
        if (entry[key] === 'Absent - PT') newObj.absent.push(dateAndYear)
        if (entry[key] === 'Partial Absence PT') newObj.partial.push(dateAndYear)
        if (entry[key] === 'excused') newObj.excused.push(dateAndYear)
      }
    }
    listOfEntries.push(newObj)
  }
  return listOfEntries
}
//, entry[]

export const createDraft = async (raw, gmail, cohort) => {
  try {
    const res = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: { message: { raw } }
    })
    // console.dir(res)
    console.log(`Draft created with ID: ${res.data.message.id}`)
  } catch ({ errors }) {
    errors.forEach((err) =>
      console.error('Error creating draft:', err.message, err.domain, err.reason, cohort)
    )
  }
}

export const generateEmails = async (entries) => {
  const domain = '@fullstackacademy.com'
  const itmEmails = {
    '2308-ET-A': `<michael.pascuzzi${domain}>, <torie.kim${domain}>, <stephanie.page${domain}>`,
    '2308-ET-B': `<Danielle.Williams${domain}>, <morgen.diaz${domain}>, <nan.wroblewski${domain}>`,
    '2308-PT-A': `<liz.hoppstetter${domain}>, <kavin.thanesjesdapong${domain}>, <edwin.marshall${domain}>`,
    '2308-PT-B': `<james.yeates${domain}>, <april.ai${domain}>, <thomas.jeng${domain}>`
  }
  const itmList = {
    '2308-ET-A': 'Michael, Torie, or Stephanie',
    '2308-ET-B': 'Danielle, Nan, or Morgen',
    '2308-PT-A': 'Liz, Kavin, or Edwin',
    '2308-PT-B': 'James, April, or Thomas'
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
    if (!entry.absences) continue
    // console.log('qualifies - has absences')
    const { firstLast, email, cohort, absences, absent, partial } = entry
    const lastAbsence = absent.at(-1) === '11-02-2023' || absent.at(-1) === '10-30-2024'
    const absenceRem = 10 - absences
    const isOverAbsences = absenceRem < 0

    if (isOverAbsences) {
      console.log(`start overAbsences to ${firstLast} in ${cohort}`)
      // console.log(absences)
      // console.log(absent.at(-1))
      // over absences allottment
      // in message beneath MIME-Version: 'Content-Transfer-Encoding: 7bit\n',
      // in 'Content-Type': text/plain; charset="UTF-8"\n
      const message = [
        'Content-Type: text/html; charset="UTF-8"\n',
        'MIME-Version: 1.0\n',
        'Content-Transfer-Encoding: 7bit\n',
        `to: <${email}>\n`,
        `cc: ${itmEmails[cohort]}\n`,
        `from: "Jeremy Rogers" <jeremy.rogers@fullstackacademy.com>\n`,
        `subject: FSA x ACC - Web Dev - Absences Exceeded [[ACTION REQUIRED]]\n\n`,
        `<p>Hello ${firstLast},</p>
        <p>I hope you're doing well. I noticed that you've been out these dates: </p>
        <ul>
        <li>${absent.join('</li><li>')}</li>
        </ul>${partial.length ? '<p>You also have partial days of' + partial.join(', ') + '/p' : ''}
        <p>Please be aware you have exceeded your allotted absences and partials and may be withdrawn under the rules of the SEA you signed and the various times it's been mentioned during the course.</p>
        <p>If you feel any of these absences are incorrect, please contact me to make the appropriate corrections. Thank you!</p>
        <p>Hope to hear back soon!</p>`
      ].join('')
      if (!overAbsenceTest) overAbsenceTest = '-------\n\n' + message
      const raw = Buffer.from(message).toString('base64')
      await createDraft(raw, gmail, cohort)
      emails++
      console.log(`end isOverAbsences to ${firstLast} in ${cohort}`)
    } else if (lastAbsence) {
      console.log(`start absences to ${firstLast} in ${cohort}`)
      // console.log(absences, absent.at(-1))
      // normal message about absences
      const message = [
        'Content-Type: text/html; charset="UTF-8"\n',
        'MIME-Version: 1.0\n',
        'Content-Transfer-Encoding: 7bit\n',
        `to: <${email}>\n`,
        `cc: ${itmEmails[cohort]}\n`,
        `from: "Jeremy Rogers" <jeremy.rogers@fullstackacademy.com>\n`,
        `subject: FSA x ACC - Web Dev - ${absenceWords[absences]} or More Absences\n\n`,
        `<p>Hello ${firstLast},</p>
        <p>I hope you're doing well. I noticed that you were out: </p>
        <ul>
        <li>${absent.join('</li><li>')}</li>
        </ul>
        ${partial.length ? '<p>You also have partial days of ' + partial.join(', ') + '</p>' : ''}
        <p>Please let your instructional team know if you need extra assistance in regard to catching up or feeling comfortable with any concepts you might feel shaky on.</p>
        <p>Please be aware you have ${absenceRem} left.</p>
        <p>Don't hesitate to reply back any time to me, ${itmList[cohort]}.</p>
        <p>We're here to support you to the best of our ability. Please use us as a resource! 🙂</p>
        <p>Hope to hear back soon!</p>`
      ].join('')
      if (!normalAbsenceTest) normalAbsenceTest = '-------\n\n' + message
      const raw = Buffer.from(message).toString('base64')
      await createDraft(raw, gmail, cohort)
      emails++
      console.log(`start absences to ${firstLast} in ${cohort}`)
    }
  }
  console.log(`generating ${emails} emails`)
  console.log('\n-------\ntest Over Absences\n\n', overAbsenceTest)
  console.log('\n-------\ntest normal absences\n\n', normalAbsenceTest)
}

// helpers

// module.exports = {
//   getConfig,
//   getToken,
//   getGP,
//   getDFile,
//   getDataGS,
//   filterAndFormatEntries,
//   generateEmails
// }
