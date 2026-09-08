import mail from '@adonisjs/mail/services/main'
import { Queue, QueueEvents, Worker, type Job } from 'bullmq'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import edge from 'edge.js'
import { IUser } from '../../interfaces/users.inteface.js'
import getRedis from '#config/redis'

const QUEUE_NAME = 'confirmation'

let my_queue: Queue | null = null
let queue_events: QueueEvents | null = null
let worker: Worker | null = null

function getQueue() {
  if (!my_queue) {
    my_queue = new Queue(QUEUE_NAME, { connection: getRedis() })
  }
  return my_queue
}

function getQueueEvents() {
  if (!queue_events) {
    queue_events = new QueueEvents(QUEUE_NAME, { connection: getRedis() })
  }
  return queue_events
}

const queue = async (payload: unknown) => {
  const job_id = randomUUID()

  await getQueue().add(QUEUE_NAME, payload, {
    jobId: job_id,
    removeOnComplete: {
      age: 60 * 60,
      count: 10,
    },
    removeOnFail: {
      age: 60 * 60,
      count: 10,
    },
  })
}

const addJobs = async (data?: { user_data: IUser; code: string }) => {
  await getQueue().add(QUEUE_NAME, data)
}

async function processJob(job: Job) {
  const { user_data, code } = job.data

  const buffer = fs.readFileSync('./assets/medkit-logo.png')
  const photo = `data:image/png;base64,${buffer.toString('base64')}`

  const html = await edge.render('templates/emails/confirmation', {
    name: user_data.name,
    photo,
    code,
  })

  return await mail.send((msg) => {
    msg
      .to(user_data.email)
      .from(process.env.SMTP_USERNAME ?? 'joaoric.amorim@gmail.com')
      .subject('Confirmação de cadastro')
      .html(html)
  })
}

async function startWorker() {
  if (worker) {
    return worker
  }

  worker = new Worker(QUEUE_NAME, processJob, { connection: getRedis() })

  getQueueEvents().on('duplicated', ({ jobId }: { jobId: string }) => {
    console.log('Job duplicated -> ', jobId)
  })

  return worker
}

const emailsQueue = {
  queue,
  addJobs,
  startWorker,
}

export default emailsQueue
