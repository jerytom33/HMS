import { Payload } from 'payload'

export class AuditService {
  /**
   * Map a domain event name (e.g. BOOKING_CREATED, ROOM_TRANSFER) onto the
   * collection's fixed action options.
   */
  private static toAction(event: string): 'CREATE' | 'UPDATE' | 'DELETE' | 'OTHER' {
    if (/CREATED?$/.test(event)) return 'CREATE'
    if (/DELETED?$/.test(event)) return 'DELETE'
    if (/^BOOKING_|TRANSFER|RENEWAL/.test(event)) return 'UPDATE'
    return 'OTHER'
  }

  /**
   * Automatically generate an append-only audit event.
   */
  static async log(
    payload: Payload,
    args: {
      entity_collection: string
      entity_id: string
      action: string
      actor?: string
      before_state?: any
      after_state?: any
      description?: string
    }
  ) {
    try {
      await payload.create({
        collection: 'system-audit-logs',
        data: {
          timestamp: new Date().toISOString(),
          action: AuditService.toAction(args.action),
          collection_slug: args.entity_collection,
          document_id: args.entity_id,
          changes: {
            event: args.action,
            actor: args.actor || 'SYSTEM',
            before: args.before_state,
            after: args.after_state,
            description: args.description,
          },
        },
      })
    } catch (err) {
      payload.logger.error(`Failed to generate automatic audit log: ${err}`)
    }
  }
}
