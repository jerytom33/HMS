import { Payload, APIError } from 'payload'

export class ContractRenewalService {
  /**
   * Renew an existing contract.
   * Preserves the old contract historically and creates a new contract instance (v2) linked to the same tenancy.
   */
  static async renew(payload: Payload, contractId: string | number) {
    const oldContract = await payload.findByID({
      collection: 'contracts',
      id: contractId,
    })

    if (!oldContract) {
      throw new APIError('Contract not found', 404)
    }

    const validStatesForRenewal = ['SIGNED', 'ACTIVE', 'EXPIRED']
    if (!validStatesForRenewal.includes(oldContract.status)) {
      throw new APIError(`INVARIANT_VIOLATION: Cannot renew a contract in ${oldContract.status} state.`, 400)
    }

    // Determine new version
    const oldVersion = oldContract.version || 1
    const newVersion = oldVersion + 1

    // Create the new contract
    const newContractData = {
      contract_number: `${oldContract.contract_number}-v${newVersion}`,
      type: oldContract.type,
      person: typeof oldContract.person === 'object' ? oldContract.person.id : oldContract.person,
      property: typeof oldContract.property === 'object' ? oldContract.property.id : oldContract.property,
      tenancy: typeof oldContract.tenancy === 'object' ? oldContract.tenancy.id : oldContract.tenancy,
      status: 'DRAFT' as const, // Start over
      terms_and_conditions: oldContract.terms_and_conditions,
      version: newVersion,
      previous_contract: oldContract.id,
    }

    const newContract = await payload.create({
      collection: 'contracts',
      data: newContractData,
    })

    // Create an audit event
    const { AuditService } = await import('./AuditService')
    await AuditService.log(payload, {
      entity_collection: 'contracts',
      entity_id: String(newContract.id),
      action: 'CONTRACT_RENEWAL',
      actor: 'SYSTEM',
      description: `Renewed contract ${oldContract.id} to new contract ${newContract.id} (v${newVersion})`,
    })

    return newContract
  }
}
