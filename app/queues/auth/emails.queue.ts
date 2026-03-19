import mail from '@adonisjs/mail/services/main'
import { Queue, QueueEvents, Worker } from 'bullmq'
import { randomUUID } from 'crypto'
import IORedis, { Redis } from 'ioredis'

const QUEUE_NAME = 'confirmation'

const connection = new Redis({
  maxRetriesPerRequest: null
})
const my_queue = new Queue(QUEUE_NAME, { connection })
const queue_events = new QueueEvents(QUEUE_NAME, { connection })

async function addJobs(data?: any) {
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

  queue_events.on('duplicated', async ({jobId}: { jobId: string }) => {
    console.log('Job duplicated -> ', jobId)
  })
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
  console.log('executing job -> ', job.id)
    const { name, email } = job.data
    const send = await mail.send((msg) => {
      msg
        .to(email)
        .from('joaoric.amorim@gmail.com')
        .subject('Confirmação de cadastro')
        .htmlView('templates/emails/confirmation', { name: name })
    })
  console.log('finished job -> ', job.id)
  },
  { connection }
)

await addJobs()

const emailsQueue = {
  queue,
  worker,
  addJobs
}

export default emailsQueue
