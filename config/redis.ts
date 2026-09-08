import env from '#start/env'
import { Redis } from 'ioredis'

let redisInstance: Redis | null = null

function getRedis() {
  if (!redisInstance) {
    redisInstance = new Redis({
      host: env.get('REDIS_HOST'),
      port: env.get('REDIS_PORT'),
      password: env.get('REDIS_PSWD'),
      maxRetriesPerRequest: null,
    })
  }

  return redisInstance
}

export default getRedis
