import { sheets, drive } from './googleAPI'

export const domain = '@fullstackacademy.com'
export const itmEmails = {
  '2308-ACC-ET-WEB-PT-A': `<michael.pascuzzi${domain}>, <torie.kim${domain}>, <stephanie.page${domain}>`,
  '2308-ACC-ET-WEB-PT-B': `<Danielle.Williams${domain}>, <morgen.diaz${domain}>, <nan.wroblewski${domain}>`,
  '2308-ACC-PT-WEB-PT-A': `<liz.hoppstetter${domain}>, <kavin.thanesjesdapong${domain}>, <edwin.marshall${domain}>`,
  '2308-ACC-PT-WEB-PT-B': `<james.yeates${domain}>, <april.ai${domain}>, <thomas.jeng${domain}>`
}
export const itmList = {
  '2308-ACC-ET-WEB-PT-A': 'Michael, Torie, or Stephanie',
  '2308-ACC-ET-WEB-PT-B': 'Danielle, Nan, or Morgen',
  '2308-ACC-PT-WEB-PT-A': 'Liz, Kavin, or Edwin',
  '2308-ACC-PT-WEB-PT-B': 'James, April, or Thomas'
}

export const absenceWords = [
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
    } = await drive.files.list({
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

export const getDataGS = async ({ spreadsheetId, sheetName, firstCol, lastCol }) => {
  // console.log(ssQuery)

  const range = `${sheetName}!${firstCol}:${lastCol}`

  const {
    data: { values }
  } = await sheets.spreadsheets.values.get({
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
