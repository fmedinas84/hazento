export type EntityId = string

export type PersonRecord = {
  id: EntityId; workspaceId: EntityId; displayName: string; firstName?: string; lastName?: string
  email?: string; organizationId?: EntityId; role?: string; phone?: string; taxId?: string
  status: string; notes?: string; archivedAt?: string; createdAt: string; updatedAt: string
}

export type OrganizationRecord = {
  id: EntityId; workspaceId: EntityId; name: string; legalName?: string; taxId?: string
  email?: string; phone?: string; website?: string; businessActivity?: string; address?: string
  commune?: string; city?: string; region?: string; notes?: string; archivedAt?: string
  createdAt: string; updatedAt: string
}

export type OpportunityRecord = {
  id: EntityId; workspaceId: EntityId; personId: EntityId; name: string; amount?: number
  expectedCloseDate?: string; stage: string; status: string; notes?: string
  wonAt?: string; lostAt?: string; lostReason?: string; createdAt: string; updatedAt: string
}

export type EngagementRecord = {
  id: EntityId; workspaceId: EntityId; personId: EntityId; opportunityId?: EntityId
  name: string; type: string; status: string; billingType: string; amount?: number
  startDate?: string; endDate?: string; notes?: string; createdAt: string; updatedAt: string
}

export type PrestationRecord = {
  id: EntityId; workspaceId: EntityId; personId: EntityId; engagementId?: EntityId
  opportunityId?: EntityId; serviceId?: EntityId; name: string; description?: string
  scheduledStart?: string; scheduledEnd?: string; durationMinutes?: number; status: string
  unitPrice: number; quantity: number; totalAmount: number; followUpNote?: string
  completedAt?: string; createdAt: string; updatedAt: string
}

export type ActivityRecord = {
  id: EntityId; workspaceId: EntityId; personId: EntityId; prestationId?: EntityId
  engagementId?: EntityId; opportunityId?: EntityId; type: string; title: string
  description?: string; status: string; source?: string; scheduledAt?: string
  completedAt?: string; createdAt: string; updatedAt: string
}

export type PaymentRequestRecord = {
  id: EntityId; workspaceId: EntityId; personId: EntityId; parentRequestId?: EntityId
  originPrestationId?: EntityId; originEngagementId?: EntityId; originOpportunityId?: EntityId
  status: string; amount: number; currencyCode: string; dueDate?: string; note?: string
  waivedAmount: number; waiverReason?: string; waivedAt?: string; waivedBy?: EntityId
  createdAt: string; updatedAt: string
}

export type PaymentRecord = {
  id: EntityId; workspaceId: EntityId; personId: EntityId; amount: number
  currencyCode: string; paymentDate?: string; method?: string; reference?: string
  status: string; notes?: string; voidedAt?: string; voidedBy?: EntityId
  voidReason?: string; createdAt: string; updatedAt: string
}

export type ServiceRecord = {
  id: EntityId; workspaceId: EntityId; name: string; description?: string
  defaultDurationMinutes?: number; defaultPrice?: number; active: boolean
  createdAt: string; updatedAt: string
}
