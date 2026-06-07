export const ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type Status = (typeof STATUSES)[number];

export const EVENT_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const SEVA_STATUSES = ['ACTIVE', 'INACTIVE', 'SOLD_OUT'] as const;
export type SevaStatus = (typeof SEVA_STATUSES)[number];

export const PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'OTHER'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const ACTIVITY_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PIN_RESET: 'PIN_RESET',
  EMPLOYEE_CREATED: 'EMPLOYEE_CREATED',
  EMPLOYEE_UPDATED: 'EMPLOYEE_UPDATED',
  EVENT_CREATED: 'EVENT_CREATED',
  EVENT_UPDATED: 'EVENT_UPDATED',
  EVENT_DELETED: 'EVENT_DELETED',
  SEVA_CREATED: 'SEVA_CREATED',
  SEVA_UPDATED: 'SEVA_UPDATED',
  TICKET_SOLD: 'TICKET_SOLD',
  RECEIPT_PRINTED: 'RECEIPT_PRINTED',
  ORG_SETTINGS_UPDATED: 'ORG_SETTINGS_UPDATED',
} as const;
