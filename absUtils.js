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
        const dateAndYear = month < 5 ? key + '-2024' : key + '-2023'
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

export const generateEmails = async (entries) => {
  let emails = 0
  let overAbsenceTest = undefined
  let normalAbsenceTest = undefined

  for (const entry of entries) {
    if (!entry.absences) continue
    // console.log('qualifies - has absences')
    const { firstLast, email, cohort, absences, absent, partial } = entry
    const lastAbsence = absent.some(
      (date) => date === '11-06-2023' || date === '11-09-2023' || date === '11-13-2023'
    )
    const absenceRem = 10 - absences
    const isOverAbsences = absenceRem < 0

    if (isOverAbsences) {
      console.log(`start overAbsences to ${firstLast} in ${cohort}`)
      const message = createAbsMessage({ email, cohort, firstLast, absent, partial }, 'overAbsence')
      if (!overAbsenceTest) overAbsenceTest = '-------\n\n' + message
      const raw = Buffer.from(message).toString('base64')
      await createDraft(raw, cohort)
      emails++
      console.log(`end isOverAbsences to ${firstLast} in ${cohort}`)
    } else if (lastAbsence) {
      console.log(`start absences to ${firstLast} in ${cohort}`)
      // console.log(absences, absent.at(-1))
      // normal message about absences
      const message = createAbsMessage(
        { email, cohort, firstLast, absent, partial, absenceRem, absences },
        'absence'
      )
      if (!normalAbsenceTest) normalAbsenceTest = '-------\n\n' + message
      const raw = Buffer.from(message).toString('base64')
      await createDraft(raw, cohort)
      emails++
      console.log(`end absences to ${firstLast} in ${cohort}`)
    }
  }
  console.log(`generating ${emails} emails`)
  console.log('\n-------\ntest Over Absences\n\n', overAbsenceTest)
  console.log('\n-------\ntest normal absences\n\n', normalAbsenceTest)
}
