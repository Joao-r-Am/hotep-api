// import { Job, Processor, Worker, WorkerOptions } from 'bullmq'
// import { QueueProcessorModel } from '@models'
// import { QueueName, QueueProcessorStatus } from '@interfaces/queue-processor'
// import { UUID } from 'crypto'
// import emailMessageQueue from './message/email-message'

// const _queues: Array<{
//   name: QueueName
//   enqueue: <T>(data: T, jobId?: string) => Promise<void>
//   process?: Processor
// }> = [
//   emailMessageQueue,

// ]
// const getRawJobId = (id: string) => id?.split(`.`)?.[0]

// const processWithLog = (queue_name: QueueName, process: Processor): Processor => {
//   return async (job: Job) => {
//     logger.info(`-> Starting job in queue ${queue_name} id:  ${job.id}`)
//     const log = await QueueProcessorModel.upsert(
//       {
//         id: getRawJobId(job.id!),
//         queue_name,
//         data: job.data,
//         status: QueueProcessorStatus.PENDING,
//         attempts: 0,
//         error: '',
//         created_at: new Date(),
//       },
//       { conflictFields: ['id'] },
//     )
//     await process(job)
//     logger.info(`-> Finished job in queue ${queue_name} id:  ${job.id}`)
//   }
// }

// const start = async () => {
//   _queues.forEach(async ({ name, process }) => {
//     const worker = new Worker(name, processWithLog(name, process!), {
//       connection: redisConnetion,
//       concurrency: 3,
//     } as WorkerOptions)

//     worker.on('completed', async (job: Job) => {
//       await QueueProcessorModel.update(
//         { status: QueueProcessorStatus.COMPLETE },
//         { where: { id: getRawJobId(job.id!) } },
//       )
//       logger.info(
//         `Job in ${job.name} completed${Object.keys(job.data).length ? ` for: ${JSON.stringify(job.data)}` : ''}`,
//       )
//       job.remove()
//     })

//     worker.on('failed', async (job?: Job, error?: Error) => {
//       if (job) {
//         const attempts = job.opts.attempts ?? 0
//         if (job.attemptsMade >= attempts) {
//           logger.error(`Job failures above threshold in ${job.name} for: ${JSON.stringify(job.data)}`, error)
//         } else {
//           logger.error(
//             `Job in ${job.name} failed for: ${JSON.stringify(job.data)} with ${
//               error?.message || 'unknown error'
//             }. ${attempts - job.attemptsMade} attempts left`,
//           )
//         }

//         await QueueProcessorModel.update(
//           { status: QueueProcessorStatus.FAILED, attempts: job.attemptsMade, error: error?.name },
//           { where: { id: getRawJobId(job.id!) } },
//         )
//       }
//     })

//     worker.on('error', (error) => {
//       logger.error(error)
//     })

//     logger.info(`Queue registered: ${name}`)
//   })
// }

// const resend = async (queue_name: QueueName, data: any, jobId: UUID) => {
//   const queue = _queues.find((q) => q.name == queue_name)

//   if (!queue) {
//     return false
//   }

//   await queue.enqueue(data, `${jobId}.${Date.now()}`)

//   return true
// }

// export const queues = {
//   start,
//   resend,
// }
