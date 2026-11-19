// Phase 0 Security Rules Verification Specification (Dirty Dozen Test Matrix)
// Designed for @firebase/rules-unit-testing against firestore.rules

export const DIRTY_DOZEN_CASES = [
  {
    id: 1,
    name: 'Privilege Escalation Create on /users/{uid}',
    path: 'users/attacker_uid',
    operation: 'create',
    auth: { uid: 'attacker_uid', token: { email: 'a@test.com', email_verified: true } },
    payload: {
      uid: 'attacker_uid',
      username: 'attacker',
      role: 'super_admin',
      is_blocked: false,
      is_deactivated: false,
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 2,
    name: 'Self-Role Elevation Update on /users/{uid}',
    path: 'users/userA',
    operation: 'update',
    auth: { uid: 'userA', token: { email: 'a@test.com', email_verified: true } },
    payload: { role: 'payment_manager', updatedAt: 'REQUEST_TIME' },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 3,
    name: 'Shadow Field Injection on /users/{uid}',
    path: 'users/userA',
    operation: 'update',
    auth: { uid: 'userA', token: { email: 'a@test.com', email_verified: true } },
    payload: { full_name: 'Legit', ghostFlag: true, updatedAt: 'REQUEST_TIME' },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 4,
    name: 'Email Spoof With email_verified=false on /settings/public',
    path: 'settings/public',
    operation: 'update',
    auth: { uid: 'spoof', token: { email: 'instagramgg2240106@gmail.com', email_verified: false } },
    payload: { upi_id: 'hacker@upi', updatedAt: 'REQUEST_TIME' },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 5,
    name: 'Cross-User PII Read on /users/userB/private/info',
    path: 'users/userB/private/info',
    operation: 'get',
    auth: { uid: 'userA', token: { email: 'a@test.com', email_verified: true } },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 6,
    name: 'Unauthorized Room Secret Read on /room_secrets/1',
    path: 'room_secrets/1',
    operation: 'get',
    auth: { uid: 'unpaidUser', token: { email: 'u@test.com', email_verified: true } },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 7,
    name: 'Orphan Slot Decrement on /tournaments/1 without atomic registration',
    path: 'tournaments/1',
    operation: 'update',
    auth: { uid: 'userA', token: { email: 'a@test.com', email_verified: true } },
    payload: { available_slots: 47, updatedAt: 'REQUEST_TIME' },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 8,
    name: 'Fake Pre-Approved Registration Create',
    path: 'registrations/1_userA',
    operation: 'create',
    auth: { uid: 'userA', token: { email: 'a@test.com', email_verified: true } },
    payload: {
      id: '1_userA',
      tournament_id: '1',
      user_id: 'userA',
      slot_number: 1,
      payment_status: 'approved',
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 9,
    name: 'Self-Approved Payment Update',
    path: 'payments/pay1',
    operation: 'update',
    auth: { uid: 'userA', token: { email: 'a@test.com', email_verified: true } },
    payload: { status: 'approved', updatedAt: 'REQUEST_TIME' },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 10,
    name: 'ID Poisoning (>128 chars) on /support_tickets/{id}',
    path: `support_tickets/${'X'.repeat(200)}`,
    operation: 'create',
    auth: { uid: 'userA', token: { email: 'a@test.com', email_verified: true } },
    payload: {},
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 11,
    name: 'Backdated Timestamp Forgery on /payments/pay2',
    path: 'payments/pay2',
    operation: 'create',
    auth: { uid: 'userA', token: { email: 'a@test.com', email_verified: true } },
    payload: {
      id: 'pay2',
      registration_id: '1_userA',
      user_id: 'userA',
      tournament_id: '1',
      amount: 50,
      transaction_ref: 'UTR12345678',
      status: 'pending',
      createdAt: '1999-01-01T00:00:00Z',
      updatedAt: '1999-01-01T00:00:00Z'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 12,
    name: 'Unscoped Collection Scraping on /payments',
    path: 'payments',
    operation: 'list',
    auth: { uid: 'userA', token: { email: 'a@test.com', email_verified: true } },
    expected: 'PERMISSION_DENIED'
  }
];
