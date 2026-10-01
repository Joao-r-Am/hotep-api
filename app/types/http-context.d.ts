import type SchedulingInvite from '../models/SchedulingInviteModel.js'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    schedulingInvite?: SchedulingInvite
  }
}
