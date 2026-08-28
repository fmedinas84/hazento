export type AdminRole = 'super_admin' | 'support'
export type UserHealth = 'new' | 'active' | 'very_active' | 'at_risk' | 'inactive'

export type AdminSession = {
  userId: string
  email: string
  role: AdminRole
}

export type UserSummary = {
  userId: string
  workspaceId: string
  name: string
  email: string
  plan: 'free' | 'plus'
  subscriptionStatus: string
  vertical: string
  clients: number
  prestations: number
  opportunities: number
  paymentRequests: number
  payments: number
  lastSignInAt: string | null
  lastActivityAt: string | null
  registeredAt: string
  workspaceCreatedAt: string
  health: UserHealth
}

export type UserDetail = UserSummary & {
  workspaceName: string
  subscription: {
    plan: 'free' | 'plus'
    status: string
    startedAt: string | null
    nextPaymentAt: string | null
    provider: string | null
    updatedAt: string | null
  }
  milestones: {
    accountCreatedAt: string
    firstClientAt: string | null
    firstPrestationAt: string | null
    firstPaymentAt: string | null
  }
}

export type DashboardData = {
  generatedAt: string
  kpis: {
    usersTotal: number
    usersThisMonth: number
    usersPreviousComparable: number
    plusTotal: number
    plusThisMonth: number
    plusPreviousComparable: number
    plusPercentage: number
    prestationsThisMonth: number
    prestationsPreviousComparable: number
    clientsThisMonth: number
    clientsPreviousComparable: number
    active7: number
    active30: number
  }
  evolution: Array<{ month: string; users: number; plus: number }>
  funnel: Array<{ label: string; value: number; percentage: number }>
}

export type SubscriptionSummary = {
  workspaceId: string
  workspaceName: string
  ownerName: string
  ownerEmail: string
  plan: 'free' | 'plus'
  status: string
  createdAt: string
  provider: string | null
  nextPaymentAt: string | null
  updatedAt: string | null
}

export type SystemData = {
  build: string | null
  failedSubscriptions: number
  failedReminders: number
  webhooksAvailable: boolean
  emailDeliveryAvailable: boolean
}

export type AdminApi = {
  session: AdminSession
  dashboard: DashboardData
  users: UserSummary[]
  subscriptions: SubscriptionSummary[]
  system: SystemData
}
