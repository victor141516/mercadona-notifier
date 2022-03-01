import { JSDOM } from 'jsdom'

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID
const PROVINCE_ID = process.env.PROVINCE_ID ?? '345'
const MUNICIPALITY_ID = process.env.MUNICIPALITY_ID ?? '4875'
const TIMEOUT_SECONDS = Number.parseInt(process.env.TIMEOUT_SECONDS ?? '300000')

if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
  throw new Error('TELEGRAM_TOKEN and TELEGRAM_CHAT_ID must be set')
}

interface Job {
  title: string
  url: string
  type: string
  salary: string
  time: string
}

async function getNewJobs(offset: number = 0): Promise<Job[]> {
  const mainUrl = new URL('https://mercadona.avature.net/es_ES/Careers/SearchJobs')
  mainUrl.searchParams.append('3_60_3', '243')
  PROVINCE_ID && mainUrl.searchParams.append('3_61_3', PROVINCE_ID)
  MUNICIPALITY_ID && mainUrl.searchParams.append('3_62_3', MUNICIPALITY_ID)
  mainUrl.searchParams.append('jobSort', 'schemaField_3_57_3')
  mainUrl.searchParams.append('jobSortDirection', 'ASC')
  mainUrl.searchParams.append('jobOffset', offset.toString())

  const document = await fetch(mainUrl.href)
    .then((r) => r.text())
    .then((html) => new JSDOM(html).window.document)

  const jobsElements = Array.from(document.querySelector('ul.list--jobs')!.querySelectorAll('li.list__item')!)
  const jobs = await Promise.all(
    jobsElements.map(async (element) => {
      const linkElement = element.querySelector('.list__item__text__title > a')! as HTMLAnchorElement
      const title = linkElement.textContent!
      const url = linkElement.href

      const jobDocument = await fetch(url)
        .then((r) => r.text())
        .then((html) => new JSDOM(html).window.document)
      const fields = Array.from(jobDocument.querySelectorAll('div.fieldSet:not(.fieldSetFullWidth)'))
        .map((fieldSet) => ({
          [fieldSet.querySelector('.fieldSetLabel')!.textContent!.trim()]: fieldSet
            .querySelector('.fieldSetValue')!
            .textContent!.trim(),
        }))
        .reduce((acc, cur) => ({ ...acc, ...cur }), {})
      const type = fields['Tipo de contrato']
      const salary = fields['Salario']
      const time = fields['Jornada laboral']
      return { title, url, type, salary, time }
    }),
  )

  const nextPageLink = document.querySelector('a.pagination__item.paginationNextLink') as HTMLAnchorElement
  if (nextPageLink) {
    const offset = Number.parseInt(nextPageLink.href.match(/jobOffset=(\d+)/)![1])
    return [...jobs, ...(await getNewJobs(offset))]
  }
  return jobs
}

const seenJobs = new Set<string>()

;(async () => {
  while (true) {
    const jobs = await getNewJobs()
    const newJobs = jobs.filter((job) => !seenJobs.has(job.url))
    if (newJobs.length > 0) {
      newJobs.forEach((job) => seenJobs.add(job.url))
      const message = newJobs.reduce(
        (acc, cur) => `${acc}

[${cur.title}](${cur.url})
*Tipo de contrato*: ${cur.type}
*Salario*: ${cur.salary}
*Jornada laboral*: ${cur.time}`,
        '',
      )
      fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      })
    }
    await new Promise((resolve) => setTimeout(resolve, TIMEOUT_SECONDS))
  }
})()
