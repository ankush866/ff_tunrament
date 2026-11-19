# Flaxy Tournament — Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Master Gate & PII Split**: Public player profiles at `/users/{userId}` never contain `email` or `phone`. Sensitive PII resides strictly under `/users/{userId}/private/info`, readable and writable only by `isOwner(userId)` or `isSuperAdmin()`.
2. **Authoritative RBAC**: Elevated staff roles (`super_admin`, `tournament_manager`, `payment_manager`, `content_manager`, `support_manager`) are resolved solely from the bootstrapped super admin email (`instagramgg2240106@gmail.com` with `email_verified == true`) or `/admins/{uid}`. Users creating `/users/{uid}` must have `role == 'user'`, `is_blocked == false`, `is_deactivated == false`, and `uid == request.auth.uid`. Users cannot alter their own `role` or `is_blocked`.
3. **Room Credential Confidentiality**: Room schedule times live in `/rooms/{tournamentId}`, whereas Free Fire `room_id_code` and `room_password` live in `/room_secrets/{tournamentId}`. Non-staff users may read `/room_secrets/{tournamentId}` only if `/registrations/${tournamentId}_${request.auth.uid}` has `payment_status == 'approved'` AND `/rooms/${tournamentId}` has `opening_at <= request.time`.
4. **Atomic Slot Reservation (`existsAfter`/`getAfter`)**: Creating `/registrations/${tournamentId}_${uid}` requires the tournament to exist with `status == 'Registration Open'` and atomically updates `/tournaments/{tournamentId}.available_slots` by `-1` in the same Firestore transaction (`getAfter`). Conversely, updating `available_slots` by non-staff requires `existsAfter(/registrations/${tournamentId}_${uid})`.
5. **Payment Verification & Terminal Locking**: Users may create `/payments/{paymentId}` with `user_id == request.auth.uid`, `status == 'pending'`, and existing matching registration. Only `isSuperAdmin()` or `payment_manager` can approve/reject payments or update `payment_status` on `/registrations/{registrationId}`.
6. **Verified Accounts & Temporal Integrity**: All authenticated writes require `request.auth.token.email_verified == true`, strictly enforce `createdAt == request.time` on create and `updatedAt == request.time` on update, and enforce `isValidId()` + `.size()` checks on every path variable and string/list field.
7. **Secure List Queries**: No `get()` or `exists()` inside any `allow list` block; owner-scoped lists (`/payments`, `/notifications`, `/support_tickets`, `/teams`, `/team_invites`) enforce `resource.data.<ownerField> == request.auth.uid` (or `request.auth.uid in resource.data.member_uids`) directly inside `allow list`.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Privilege Escalation Create**: User signs up writing `/users/{uid}` with `role: "super_admin"` or `is_blocked: false` spoofed on `/users/{otherUid}`.
2. **Self-Role Update**: Authenticated user updates own `/users/{uid}` with `{ role: "super_admin", updatedAt: serverTimestamp() }`.
3. **Shadow Field Injection**: Authenticated user updates `/users/{uid}` adding `{ isVerifiedAdmin: true }` (`affectedKeys` / `hasOnly` violation).
4. **Admin Email Spoof (`email_verified: false`)**: Attacker token has `email: "instagramgg2240106@gmail.com"` with `email_verified: false` reading `/users/{other}/private/info` or mutating `/settings/public`.
5. **PII Leak (`get` on `/private/info`)**: User A attempts `getDoc(doc(db, 'users', 'userB', 'private', 'info'))`.
6. **Room Credential Leak Early / Unpaid**: Unregistered or pending user attempts `getDoc(doc(db, 'room_secrets', '1'))` or approved user attempts read before `rooms/1.opening_at`.
7. **Orphan Slot Decrement**: User A attempts `updateDoc(doc(db, 'tournaments', '1'), { available_slots: 47, updatedAt: serverTimestamp() })` without creating `/registrations/1_userA` in the same batch.
8. **Fake Pre-Approved Registration**: User A creates `/registrations/1_userA` directly with `payment_status: "approved"`.
9. **Payment Self-Approval**: User A updates own `/payments/pay1` setting `status: "approved"`.
10. **Path ID Poisoning**: User creates document with 1.5KB junk ID or slash characters `/registrations/${'A'.repeat(300)}`.
11. **Timestamp Forgery**: User creates `/payments/pay1` with backdated `createdAt: Timestamp.fromMillis(1000)` instead of `serverTimestamp()`.
12. **Blanket List Scraping**: User A runs unbounded `getDocs(collection(db, 'payments'))` or `getDocs(collection(db, 'notifications'))` without matching `where('user_id', '==', auth.uid)`.
