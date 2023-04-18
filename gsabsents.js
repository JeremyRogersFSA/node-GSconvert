import csv2json from 'csvtojson'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

const { stdout: rawFiles } = await execPromise(`ls`)
const files = rawFiles.split(`\n`).slice(0, -1)
const filename = `absents-${Date().split(' ').slice(1, 4).join('-')}.csv`

await execPromise(`touch ${filename}`)
await execPromise(`echo 'sName,status,date' >> ${filename}`)

for (const file of files) {
  if (file.slice(file.indexOf('.')) === '.csv' && file.slice(0, 5) === 'U-Att') {
    const date1 = file
      .slice(6, 10)
      .split('-')
      .map((n) => Number(n))
      .join('/')
    const date2 = file
      .slice(6, 10)
      .split('-')
      .reduce((acc, curr, index) => {
        if (index === 0) {
          acc += curr
          return acc
        }
        if (index === 1) {
          let num = Number(curr) + 3
          acc += `/${num}`
          return acc
        }
      }, '')
    console.log(date1)
    console.log(date2)
    const contents = await csv2json().fromFile(`${file}`)
    for (const content of contents) {
      let sn = content.sName.replace(/'/g, '_')
      const c1 = content.class1
      const c2 = content.class2

      // if (sn.includes("'")) sn = sn.split("'").join('_')

      const class1 = `${sn},${c1},${date1}`
      const class2 = `${sn},${c2},${date2}`
      if (c1 !== 'Attended' && c1 !== 'No Status') {
        await execPromise(`echo '${class1}' >> ${filename}`)
        console.log(`added ${class1}`)
      }
      if (c2 !== 'Attended' && c2 !== 'No Status') {
        await execPromise(`echo '${class2}' >> ${filename}`)
        console.log(`added ${class2}`)
      }
    }
  }
}

// let i = 10
// while (i >= 0) {
//   await execPromise(
//     `cp attendance_reports_attendance-8845b380-167a-4886-8083-830ae867f0f4.csv ${i}.csv`
//   )
//   i--
// }
