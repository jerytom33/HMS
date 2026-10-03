import { Payload, APIError } from 'payload'

export class RoomTransferService {
  /**
   * Executes a room transfer operation.
   * Releases old bed, occupies new bed, and preserves historical data.
   */
  static async execute(payload: Payload, args: { tenancyId: string | number, targetBedId: string | number, reason?: string }) {
    const { tenancyId, targetBedId, reason } = args

    const tenancy = await payload.findByID({
      collection: 'tenancies',
      id: tenancyId,
    })

    if (!tenancy) {
      throw new APIError('Tenancy not found', 404)
    }

    if (tenancy.status !== 'ACTIVE') {
      throw new APIError(`INVARIANT_VIOLATION: Can only transfer an ACTIVE tenancy. Current status is ${tenancy.status}.`, 400)
    }

    const currentBedId = typeof tenancy.bed === 'object' ? tenancy.bed.id : tenancy.bed

    if (currentBedId === targetBedId) {
      throw new APIError('Target bed is the same as current bed', 400)
    }

    const targetBed = await payload.findByID({
      collection: 'beds',
      id: targetBedId,
    })

    if (!targetBed) {
      throw new APIError('Target bed not found', 404)
    }

    if (targetBed.operational_status !== 'AVAILABLE') {
      throw new APIError(`INVARIANT_VIOLATION: Target bed is ${targetBed.operational_status}. It must be AVAILABLE.`, 400)
    }
    
    if (targetBed.occupancy_status !== 'VACANT') {
      throw new APIError(`INVARIANT_VIOLATION: Target bed is ${targetBed.occupancy_status}. It must be VACANT.`, 400)
    }

    // Release old bed
    await payload.update({
      collection: 'beds',
      id: currentBedId,
      data: {
        occupancy_status: 'VACANT'
      }
    })

    // Occupy new bed
    await payload.update({
      collection: 'beds',
      id: targetBedId,
      data: {
        occupancy_status: 'OCCUPIED'
      }
    })

    // Note: Assuming room and property relation updates would be needed as well if moving across rooms/properties.
    // Assuming targetBed correctly resolves its room and property.
    const newRoomId = typeof targetBed.room === 'object' ? targetBed.room.id : targetBed.room

    // Update tenancy to new bed
    await payload.update({
      collection: 'tenancies',
      id: tenancyId,
      data: {
        bed: targetBedId,
        // Optional: update room/property fields on Tenancy if they exist
      }
    })

    // Create Audit/Transfer Event explicitly (simulated via SystemAuditLogs here, or specific RoomTransfers collection if created)
    const { AuditService } = await import('./AuditService')
    await AuditService.log(payload, {
      entity_collection: 'tenancies',
      entity_id: String(tenancyId),
      action: 'ROOM_TRANSFER',
      actor: 'SYSTEM', // Replace with req.user in a real endpoint context
      before_state: { bed: currentBedId },
      after_state: { bed: targetBedId, reason },
      description: `Transferred from bed ${currentBedId} to ${targetBedId}`,
    })

    return await payload.findByID({
      collection: 'tenancies',
      id: tenancyId,
    })
  }
}
