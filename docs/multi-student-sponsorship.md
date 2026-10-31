# Multi-student sponsorship

Donors can select several children and sponsor all of them with **one payment**. The existing
single-child flow (`/sponsor/[learnerId]`) is unchanged; the cart is an additional path.

## 1. UX flow

### Donor journey

```
/sponsor (choose children)
  │  "Add to cart" on each available child ──► sticky cart bar: "3 children · ₹900/mo  Review cart →"
  ▼
/sponsor/cart (review)
  │  remove children · pick Monthly / Yearly · see per-child price × count = total
  │  enter name, email, phone once · "Pay ₹900 →"
  ▼
Cashfree checkout (one payment for every child in the cart)
  ▼
/sponsor/thank-you?order_id=VPC_… (one confirmation listing every sponsored child)
```

### Selection rules

| Rule                | Decision                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| Who can be selected | Only children shown as **Ready for sponsorship** (no active sponsor, no checkout in progress).      |
| Duplicates          | A child appears at most once per cart. Adding the same child twice is rejected with a clear error.  |
| Minimum             | 1 child is required to check out.                                                                   |
| Maximum             | 10 children per cart (`MAX_CART_LEARNERS`). The "Add" control is disabled once the limit is hit.    |
| Plan                | One plan (Monthly or Yearly) applies to the whole cart.                                             |
| Amount              | Per-child plan price × number of children. The server recomputes it; the client cannot override it. |

### Cart behaviour

- **Persistence** – the cart lives on the server; the browser keeps only the cart id in
  `localStorage`. It survives reloads and new tabs on the same device without needing a login.
- **Add / remove** – instant from the child grid (toggle) and from the cart page (remove).
- **Locking** – once checkout starts the cart is locked. It re-opens automatically if the payment
  fails, the gateway errors, or the reservation window passes without payment.
- **After payment** – a paid cart is finished. The browser forgets it and the next selection starts a
  new cart.
- **Unknown cart** – if the stored id no longer exists it is dropped silently and an empty cart is
  shown.

### Key states (wireframes)

```
Child grid card (available)            Child grid card (in cart)
┌────────────────────────┐            ┌────────────────────────┐
│        (photo)         │            │        (photo)         │
│      Asha Kumar        │            │      Asha Kumar        │
│        GRADE 8         │            │        GRADE 8         │
│ • Ready for sponsorship│            │ • Ready for sponsorship│
│     Sponsor Asha →     │            │     Sponsor Asha →     │
│   [ + Add to cart ]    │            │     [ ✓ In cart ]      │
└────────────────────────┘            └────────────────────────┘

Cart bar (select page, at least one child)
┌──────────────────────────────────────────────────────────────┐
│ 3 children selected · ₹900/mo               [ Review cart → ] │
└──────────────────────────────────────────────────────────────┘

Cart page
┌──────────────────────────────────────────────────────────────┐
│ ← Choose more children                                       │
│ Sponsor 3 children at once                                   │
│  Asha Kumar  · Grade 8 · ₹300/mo                   [Remove]  │
│  Ravi Sharma · Grade 6 · ₹300/mo                   [Remove]  │
│  Meera       · Grade 5 · ⚠ Already sponsored       [Remove]  │
│ [ Monthly | Yearly ]   per-child breakdown                   │
│ ₹300 × 3 children = ₹900/mo                                  │
│ Your details: name / email / phone          [ Pay ₹900 → ]   │
└──────────────────────────────────────────────────────────────┘
```

| State                | What the donor sees                                                                 |
| -------------------- | ----------------------------------------------------------------------------------- |
| Loading              | Skeleton rows; pay button disabled.                                                 |
| Empty                | "Your cart is empty" with a link back to the child grid.                            |
| Populated            | Children, plan toggle, totals and the donor form.                                   |
| Child unavailable    | The row is flagged with the reason; paying is blocked until the child is removed.   |
| Checkout in progress | Banner explaining the cart is locked while a payment is open; editing is disabled.  |
| Error                | Inline error with the server message and a retry action; the cart is never lost.    |
| Success              | Thank-you page listing every sponsored child, the plan and the total paid.          |
| Payment failed       | Thank-you page shows the failure; "Try again" returns to the same (re-opened) cart. |

### Edge cases and error states

| Situation                                              | Behaviour                                                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Child gets sponsored by someone else while in the cart | Cart flags the child. Checkout returns `409` listing unavailable children; nothing is charged. |
| Another donor is mid-checkout for one of the children  | Same as above (`pending_order`); the donor can remove the child or retry after the window.     |
| Donor double-clicks Pay / retries the request          | The same idempotency key returns the same payment session; no second order is created.         |
| A second tab starts checkout for the same cart         | `409 Checkout already in progress`; only one payment can be open per cart.                     |
| Cart edited while checkout is starting                 | Checkout aborts with `409` and the cart re-opens; the donor reviews and pays again.            |
| Payment gateway error before payment                   | All holds are released, the cart re-opens and the donor can retry.                             |
| Payment fails                                          | Every child in the payment is released; the cart becomes editable and can be paid again.       |
| Donor abandons the Cashfree page                       | Holds expire after the reservation window; the cart re-opens on the next visit.                |
| Webhook delivered twice / webhook and status sync race | Settlement is idempotent per child order; children are never assigned twice.                   |
| Payment lands after the hold expired                   | Still recorded as paid; children not taken by another sponsor in the meantime are assigned.    |
