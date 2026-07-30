# WebSocket Events

Real-time contracts for the Voyago tours backend. Swagger does not cover
sockets, so this file is the source of truth for the frontend team.

Both gateways authenticate the handshake with the **same access token** used for
REST. Pass it as `auth.token` when connecting:

```js
const socket = io('http://localhost:3000/bookings', { auth: { token: accessToken } });
```

An unauthenticated handshake on the `/bookings` namespace is disconnected
immediately.

---

## `/bookings` namespace — BookingsGateway

Pushes booking status transitions to the owning tourist. On connect the client
is joined to its own `user:<userId>` room automatically; no subscribe message is
needed.

| Direction | Event | Payload |
|-----------|-------|---------|
| server → client | `booking.status_changed` | `{ reference: string, status: 'PENDING' \| 'CONFIRMED' \| 'CANCELLED' \| 'COMPLETED', changedAt: string (ISO) }` |

Emitted when a booking is created (`PENDING`), paid (`CONFIRMED`), cancelled
(`CANCELLED`), or completed (`COMPLETED`). Always emitted **after** the database
transaction commits.

---

## `/availability` namespace — AvailabilityGateway

Broadcasts remaining-seat changes on a departure so a browsing client can watch
capacity drop as others book. The client opts in per departure.

| Direction | Event | Payload |
|-----------|-------|---------|
| client → server | `departure.subscribe` | `{ departureId: string }` |
| client → server | `departure.unsubscribe` | `{ departureId: string }` |
| server → client | `availability.changed` | `{ departureId: string, seatsLeft: number, capacity: number }` |

`availability.changed` is emitted after any booking create/cancel commits for
that departure, to everyone in the `departure:<departureId>` room.
