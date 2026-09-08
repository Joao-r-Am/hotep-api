import { defineConfig } from '@adonisjs/cors'
import env from '#start/env'

/**
 * Configuration options to tweak the CORS policy. The following
 * options are documented on the official documentation website.
 *
 * https://docs.adonisjs.com/guides/security/cors
 */
const allowedOrigins = env
  .get('CORS_ORIGINS', '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const corsConfig = defineConfig({
  enabled: true,
  origin: (origin) => {
    if (allowedOrigins.includes('*')) {
      return true
    }

    if (!origin || allowedOrigins.includes(origin)) {
      return true
    }

    return false
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
