import { drive, sheets, gmail } from './googleAPI'
import { domain, itmEmails, itmList } from './utils'
import { createMessage, createDraft } from './emails'

const C_BLOCK = Number(process.env.C_BLOCK)
const CS_OFFSET = Number(process.env.CS_OFFSET)
const wsOffset = C_BLOCK - CS_OFFSET - 2
const ccOffset = wsOffset

const addWorkshop = ({ entry, key, newObj }) => {
  if (key.includes('WS') && key !== 'missingWS') {
    const value = Number(entry[key])
    const isGrading = entry[key] === 'g'
    const isMissing = entry[key] === ''
    newObj.ws[key] = isGrading
      ? 'grading'
      : isMissing
      ? 'missing'
      : value > 0
      ? (newObj.missingWS--, 'complete')
      : (newObj.missingWS--, 'incomplete')
  }
}
const addAssn = ({ entry, key, newObj }, type) => {
  const missingType = `missing${type}`
  if (type === undefined) addWorkshop({ entry, key, newObj })
  else if (key.includes(type) && key !== missingType) {
    const value =
      entry[key].toUpperCase() === 'TRUE' ? (newObj[missingType]--, 'complete') : 'incomplete'
    const isMissing = entry[key] === ''
    newObj[type.toLowerCase()][key] = isMissing ? 'missing' : value
  }
}

export const filterAndFormatGrades = (listOfEntries, entry) => {
  const isWithdrawn = entry.withdrawn === 'TRUE'
  if (!isWithdrawn) {
    entry.withdrawn = false
    const [last, first] = entry.name.split(', ')
    entry.firstLast = `${first} ${last}`
    // console.log(entry.sName)
    const newObj = {
      name: entry.name,
      firstLast: entry.firstLast,
      email: entry.email,
      cohort: entry.cohort,
      withdrawn: entry.withdrawn,
      missingWS: wsOffset,
      missingCS: CS_OFFSET,
      missingCC: ccOffset,
      ws: {},
      cc: {},
      cs: {}
    }
    for (const key in entry) {
      const assnNum = Number(key.slice(2))
      if (isNaN(assnNum)) continue
      if (assnNum > C_BLOCK) continue
      addAssn({ entry, key, newObj })
      addAssn({ entry, key, newObj }, 'CC')
      addAssn({ entry, key, newObj }, 'CS')
    }
    listOfEntries.push(newObj)
  }
  return listOfEntries
}

export const generateGradingEmails = async (entries) => {
  let emails = 0

  for (const entry of entries) {
    if (!entry.missingWS && !entry.missingCS && !entry.missingCC) continue

    const message = createMessage({ ...entry }, 'grades')
    const raw = Buffer.from(message).toString('base64')
    await createDraft(raw, gmail, entry.cohort)
    emails++
    if (emails === 1) console.log(message)
    console.log(`Grading email for ${entry.firstLast} in ${entry.cohort}`)
  }

  console.log(`generating ${emails} emails`)
}
export const gradingCheck = (entries) => {
  const setExample = (entries, att, type) => {
    for (const entry of entries) {
      for (const key in entry[att]) {
        if (entry[att][key] === type) {
          return { ...entry, ws: entry.ws, cc: entry.cc, cs: entry.cs }
        }
      }
    }
  }
  const gradingExample = setExample(entries, 'ws', 'grading')
  const missingWsExample = setExample(entries, 'ws', 'missing')
  const ccExample = setExample(entries, 'cc', 'incomplete')

  console.log({ gradingExample, missingWsExample, ccExample })
}
