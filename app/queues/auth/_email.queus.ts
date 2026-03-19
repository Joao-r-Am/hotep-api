// import { IMessageEmail } from '@interfaces/message'
// import { NotificationLogItemStatus, NotificationLogItemType } from '@interfaces/notification_log_item'
// import { QueueName } from '@interfaces/queue-processor'
// import redisConnetion from '@lib/redis'
// import { NotificationLogItemModel } from '@models'
// import emailService from '@services/email'
// import { Job, Processor, Queue } from 'bullmq'
// import { randomUUID } from 'crypto'
// import { Sequelize } from 'sequelize'

// const QUEUE_NAME = QueueName.EMAIL

// const queue: Queue = new Queue(QUEUE_NAME, {
//   connection: redisConnetion,
//   defaultJobOptions: {
//     attempts: 5,
//     backoff: {
//       type: 'exponential',
//       delay: 1000,
//     },
//   },
// })
// const enqueue = async <IMessageEmail>(data: IMessageEmail, jobId: string = randomUUID()) => {
//   await queue.add(QUEUE_NAME, data, { jobId })
// }

// const process: Processor = async (job: Job<IMessageEmail>): Promise<void> => {
//   const { id_branch, email, template, data, attachments, id_notification_log } = job.data

//   attachments?.forEach((attachment) => {
//     if (attachment.contentBase64) {
//       Object.assign(attachment, {
//         buffer: Buffer.from(attachment.contentBase64, 'base64'),
//       })
//     }
//   })

//   let log_item: NotificationLogItemModel | undefined

//   try {
//     if (id_notification_log) {
//       ;[log_item] = await NotificationLogItemModel.findOrCreate({
//         where: {
//           id_notification_log: id_notification_log,
//           destination: email,
//           type: NotificationLogItemType.EMAIL,
//         },
//         defaults: {
//           id_notification_log: id_notification_log!,
//           destination: email!,
//           type: NotificationLogItemType.EMAIL,
//           status: NotificationLogItemStatus.PENDING,
//           attempts: 0,
//           error: null,
//           notified_at: new Date(),
//           created_at: new Date(),
//         },
//       })
//     }

//     const result = await emailService.send(email, template, data, id_branch, attachments)

//     if (!result) {
//       throw { message: 'error.email-not-sent', status: 400 }
//     }

//     await log_item?.update({
//       status: NotificationLogItemStatus.SUCCESS,
//       attempts: Sequelize.literal('attempts + 1'),
//       error: null,
//       notified_at: new Date(),
//       id_external: result.response,
//     })
//   } catch (err) {
//     await log_item?.update({
//       status: NotificationLogItemStatus.ERROR,
//       attempts: Sequelize.literal('attempts + 1'),
//       error: JSON.stringify(err),
//     })

//     throw err
//   }
// }

// const emailMessageQueue = {
//   name: QUEUE_NAME,
//   enqueue,
//   process,
// }

// export default emailMessageQueue
