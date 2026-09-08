import { defineConfig, stores } from '@adonisjs/limiter'

const limiterConfig = defineConfig({
  default: 'memory',
  stores: {
    memory: stores.memory({}),
  },
})

export default limiterConfig
