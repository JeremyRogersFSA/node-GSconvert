import { itmEmails, absenceWords } from './utils'
import { gmail } from './googleAPI'

export const createMessage = (
  {
    email,
    cohort,
    firstLast,
    absent,
    partial,
    absences,
    absenceRem,
    ws,
    cc,
    cs,
    missingWS,
    missingCS,
    missingCC
  },
  type
) => {
  const preamble = [
    'Content-Type: text/html; charset="UTF-8"\n',
    'MIME-Version: 1.0\n',
    'Content-Transfer-Encoding: 7bit\n',
    `to: <${email}>\n`,
    `cc: ${type === 'grades' ? '' : itmEmails[cohort]}\n`,
    `from: "Jeremy Rogers" <jeremy.rogers@fullstackacademy.com>\n`
  ].join('')
  let subject
  let body
  // absences
  if (type === 'overAbsence') {
    subject = `subject: FSA x ACC - Web Dev - Absences Exceeded [[ACTION REQUIRED]]\n\n`

    body = `<p>Hello ${firstLast},</p>
    <p>I hope you're doing well. I noticed that you've been out these dates: </p>
    <ul>
    <li>${absent.join('</li><li>')}</li>
    </ul>${partial.length ? '<p>You also have partial days of' + partial.join(', ') + '/p' : ''}
    <p>Please be aware you have exceeded your allotted absences and partials and may be withdrawn under the rules of the SEA you signed and the various times it's been mentioned during the course.</p>
    <p>If you feel any of these absences are incorrect, please contact me to make the appropriate corrections. Thank you!</p>
    <p>Hope to hear back soon!</p>`
  }
  if (type === 'absence') {
    subject = `subject: FSA x ACC - Web Dev - ${absenceWords[absences]} or More Absences\n\n`

    body = `<p>Hello ${firstLast},</p>
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
  }
  // grading
  if (type === 'grades') {
    const currentBlock = Number(process.env.C_BLOCK)
    const WSmissing = []
    const CCmissing = []
    const CSmissing = []
    const WSinc = []
    const CCinc = []
    const CSinc = []
    for (let i = 1; i < 35; i++) {
      if (i > currentBlock) break
      if (ws[`WS${i}`] === 'missing') WSmissing.push(i)
      if (ws[`WS${i}`] === 'incomplete') WSinc.push(i)
      if (cc[`CC${i}`] === 'missing') CCmissing.push(i)
      if (cc[`CC${i}`] === 'incomplete') CCinc.push(i)
      if (cs[`CS${i}`] === 'missing') CSmissing.push(i)
      if (cs[`CS${i}`] === 'incomplete') CSinc.push(i)
    }
    subject = `subject: FSA x ACC - Web Dev - Missing or Incomplete Assignments [[ACTION REQUIRED]]\n\n`

    body = `<p>Hello ${firstLast},</p>
    <p> I hope you're doing well. I noticed that you have some missing and incomplete assignments to work on: </p>
    <p>Missing Workshops: ${missingWS}</p>
    <p>Missing Competency Checks: ${missingCC}</p>
    <p>Missing Career Simulations: ${missingCS}</p>
    <p style="font-weight: bold;">Missing Workshop Blocks:</p>
    <p>${WSmissing.length ? WSmissing.join(', ') : 'none'}</p>
    <p style="font-weight: bold;">Missing Competency Check Blocks:</p>
    <p>${CCmissing.length ? CCmissing.join(', ') : 'none'}</p>
    <p style="font-weight: bold;">Missing Career Simulation Blocks:</p>
    <p>${CSmissing.length ? CSmissing.join(', ') : 'none'}</p>
    <p style="font-weight: bold;">Incomplete Workshop Blocks:</p>
    <p>${WSinc.length ? WSinc.join(', ') : 'none'}</p>
    <p style="font-weight: bold;">Incomplete Competency Check Blocks:</p>
    <p>${CCinc.length ? CCinc.join(', ') : 'none'}</p>
    <p style="font-weight: bold;">Incomplete Career Simulation Blocks:</p>
    <p>${CSinc.length ? CSinc.join(', ') : 'none'}</p>
    <p>&nbsp;</p>
    <p>If you feel any of these are in error, please let me know so we can investigate why we see an assignment as "missing" or "incomplete". We want to make sure our records and yours are both in alignment.</p>
    <p>Please let your instructional team know of any regrading that needs to be done, due to pushing new content from GitHub. Thank you!</p>
    <p>Best Wishes,</p>
    `
  }
  return [preamble, subject, body].join('')
}

export const createDraft = async (raw, cohort) => {
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
