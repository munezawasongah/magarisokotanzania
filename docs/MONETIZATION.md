# MagariSOKO Tanzania — monetization blueprint (Tanzania)

Every revenue stream below is already built: schema, pricing tables, checkout and fulfilment. Prices are seeded in `src/config/site.ts`, and you can change them in the `Plan` and `PromotionProduct` tables without redeploying. All payments go through M-Pesa, Mixx by Yas, Airtel Money, HaloPesa, AzamPesa or card.

The strategy is to **keep it free for buyers and for the first two private listings.** Liquidity, meaning many cars listed, is what attracts buyers. Revenue comes from the sellers who get the most value: dealers, importers and parts shops.

## 1. Dealer, importer and vendor subscriptions (core recurring revenue)

| Plan | TZS / month | What they get |
|---|---|---|
| Dealer Starter | 150,000 | 25 active listings, 2 featured credits, showroom page |
| Dealer Pro | 350,000 | 100 listings, 8 featured credits, lead analytics, verified badge (instant publishing) |
| Dealer Enterprise | 750,000 | Unlimited listings, 20 featured credits |
| Importer Pro | 400,000 | 200 listings with import-on-order landed-cost quotes |
| Parts Store Basic / Pro | 50,000 / 120,000 | 150 / 2,000 parts, storefront page |
| Service Directory / Premium | 30,000 / 80,000 | Directory listing / priority placement and analytics |

A yearly plan costs 10 months' price. A business without a plan can keep 5 active listings, which works as a free trial. When a dealer reaches the limit, the API returns HTTP 402 with an upgrade message.

**Why it works here:** Dar es Salaam showrooms already pay for newspaper classifieds, Instagram boosts and brokers. A single sale earns a dealer TZS 1–5M margin, so one extra lead a month covers Dealer Pro.

## 2. Pay-per-promotion for listings (impulse revenue from everyone)

| Product | TZS | Effect |
|---|---|---|
| Bump to top | 5,000 | Listing returns to the top of "Newest" |
| Featured — 7 days | 15,000 | Pinned above normal results, yellow plate badge |
| Featured — 30 days | 45,000 | Same, for a month |
| Sponsored carousel — 7 days | 30,000 | Home and search sponsored strip |
| Homepage spotlight — 7 days | 60,000 | Homepage hero placement |

These amounts fit a single M-Pesa transaction, so private sellers will impulse-buy them. The dashboard shows views and WhatsApp clicks per listing, which shows sellers what a boost bought them.

## 3. Listing fees beyond the free allowance

Private sellers get 2 free active listings. Each one after that costs **TZS 10,000** for 60 days. This also stops brokers from posting as "private" sellers to avoid paying for a dealer plan.

## 4. Display advertising and sponsored placements

The `AdPlacement` slots are: home hero, home inline, top and sidebar of search results, listing detail, and the parts page. Impressions and clicks are counted, and clicks go through `/api/ads/:id/click`. Good-fit advertisers are banks (CRDB, NMB, Stanbic car loans), insurers (Jubilee, Britam, Sanlam), tyre and lubricant brands (Total, Puma, Oryx), and clearing agents.

**Indicative rates:** TZS 1–3M per month for a home slot, and TZS 500k per month for category-targeted search slots (for example, tyre brands on 4×4 searches).

## 5. Transaction services: inspection, financing and insurance leads (highest margin per user)

- **Pre-purchase inspection:** buyers book a certified mechanic (TZS 60–80k). The platform keeps a 20–25% commission or a fixed booking fee (`InspectionRequest.feeTzs`).
- **Financing and insurance referrals:** the finance calculator and the "Ask about financing" inquiry type produce qualified leads. Bank and insurer partners pay a cost-per-lead (TZS 10–25k) or 0.5–1% of the disbursed loan.
- **Import-on-order commission:** importers' landed-cost quotes turn into orders. You can charge a success fee (1–2% of CIF) once the `Inquiry` is marked `CLOSED_WON`.

## Rollout order

1. **Months 0–3:** everything free except promotions. Onboard 50–100 Dar dealers and Kariakoo parts shops by hand, and verify them so the badge means something.
2. **Months 3–6:** switch on subscriptions with a 30-day trial, and sell the first bank and insurer partnerships.
3. **Months 6+:** launch inspection booking, saved-search SMS alerts (a paid add-on for heavy buyers), and dealer data reports (price trends by model and region).
