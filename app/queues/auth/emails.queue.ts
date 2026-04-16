import mail from '@adonisjs/mail/services/main'
import { Queue, QueueEvents, Worker } from 'bullmq'
import { randomUUID } from 'crypto'
import { Redis } from 'ioredis'
import fs from 'fs'
import edge from 'edge.js'
import { VerifaliaRestClient } from 'verifalia'
import generateCode from '../../utils/generate-code.js'
import { IUser } from '../../interfaces/users.inteface.js'

const QUEUE_NAME = 'confirmation'

const connection = new Redis({
  maxRetriesPerRequest: null,
})
const my_queue = new Queue(QUEUE_NAME, { connection })
const queue_events = new QueueEvents(QUEUE_NAME, { connection })

async function addJobs(data?: {user_data: IUser, code: string}) {
  await my_queue.add(QUEUE_NAME, data)
}

const queue = async (payload: any) => {
  const job_id = randomUUID()

  console.log('Adding job to queue -> ', job_id)

  await my_queue.add(QUEUE_NAME, payload, {
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

  queue_events.on('duplicated', async ({ jobId }: { jobId: string }) => {
    console.log('Job duplicated -> ', jobId)
  })
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    try {
      const { user_data, code } = job.data

      const buffer = fs.readFileSync('./assets/medkit-logo.png')
      const photo = `data:image/png;base64,${buffer.toString('base64')}`

      const html= await edge.render('templates/emails/confirmation', { name: user_data.name, photo, code })

      return await mail.send((msg) => {
        msg.to(user_data.email).from('joaoric.amorim@gmail.com').subject('Confirmação de cadastro').html(html)
      })
    } catch (err) {
      throw err
    }
  },
  { connection }
)

await addJobs()

const emailsQueue = {
  queue,
  worker,
  addJobs,
}

export default emailsQueue
