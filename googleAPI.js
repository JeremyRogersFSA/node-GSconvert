import { google } from 'googleapis'

export const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
)

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN })

export const sheets = google.sheets({ version: 'v4', auth: oAuth2Client })
export const drive = google.drive({ version: 'v3', auth: oAuth2Client })
export const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

export const getToken = async () => {
  const { token } = await oAuth2Client.getAccessToken()
  console.log(token)
  return token
}
