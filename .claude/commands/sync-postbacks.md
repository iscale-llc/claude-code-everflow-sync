description: Sync postback pixels from source network to fire conversions to iScale

# Everflow Postback Sync

Set up postback pixels in a source affiliate network to fire conversions to iScale.

## Prerequisites

- Offer must already exist in both source network AND iScale
- You need the source offer ID and iScale offer ID

## Step 1: Select Source Network

Read `.env.local` to find available API keys. Ask user which source network (excluding ISCALE_API_KEY).

## Step 2: Select Offer

Ask the user for:
- **Source offer ID** (in the affiliate network)
- **iScale offer ID** (the synced offer in iScale)

Or check `offers/{network}/{offerId}/iscale_offer_id.txt` if it exists.

## Step 3: Get iScale Configuration

### 3.1 Get Tracking Domain
```bash
# Temporarily set offer to public
PATCH https://api.eflow.team/v1/networks/patch/offers/apply
Header: X-Eflow-API-Key: {ISCALE_API_KEY}
{"network_offer_ids": [iscaleOfferId], "fields": [{"field_type": "visibility", "field_value": "public"}]}

# Generate tracking link to discover domain
POST https://api.eflow.team/v1/networks/tracking/offers/clicks
Header: X-Eflow-API-Key: {ISCALE_API_KEY}
{"network_offer_id": iscaleOfferId, "network_affiliate_id": 1}
# Response: {"url": "https://www.{tracking_domain}.com/..."}
# Extract domain from URL

# Reset visibility
PATCH https://api.eflow.team/v1/networks/patch/offers/apply
{"network_offer_ids": [iscaleOfferId], "fields": [{"field_type": "visibility", "field_value": "require_approval"}]}
```

**Known iScale tracking domain:** `{your_tracking_domain}`

### 3.2 Get/Set Advertiser Verification Token

Get the advertiser ID from the iScale offer:
```bash
GET https://api.eflow.team/v1/networks/offers/{iscaleOfferId}
Header: X-Eflow-API-Key: {ISCALE_API_KEY}
# Extract: network_advertiser_id
```

Check if verification token exists:
```bash
GET https://api.eflow.team/v1/networks/advertisers/{advertiserId}
Header: X-Eflow-API-Key: {ISCALE_API_KEY}
# Check: verification_token field
```

If empty, set one:
```bash
PATCH https://api.eflow.team/v1/networks/patch/advertiser/apply
Header: X-Eflow-API-Key: {ISCALE_API_KEY}
{
  "network_advertiser_ids": [advertiserId],
  "fields": [{"field_type": "verification_token", "field_value": "{source_network}_iscale_2025"}]
}
```

**Known tokens:**
| Advertiser | ID | Token |
|------------|-----|-------|
| {Advertiser} | {id} | `{network}_iscale_{year}` |

## Step 4: Get Event Mappings

### 4.1 Get Source Offer Events
```bash
GET https://api.eflow.team/v1/affiliates/offers/{sourceOfferId}
Header: X-Eflow-API-Key: {source_api_key}
# Extract: relationship.payouts.entries[]
# Each entry has: network_offer_payout_revenue_id, entry_name, is_default
```

### 4.2 Get iScale Offer Events
```bash
GET https://api.eflow.team/v1/networks/offers/{iscaleOfferId}
Header: X-Eflow-API-Key: {ISCALE_API_KEY}
# Extract: relationship.payout_revenue.entries[]
# Each entry has: network_offer_payout_revenue_id, entry_name, is_default
```

### 4.3 Map Events by Name
Match source event `entry_name` to iScale event `entry_name` to get the iScale `network_offer_payout_revenue_id` for each.

## Step 5: Check Existing Pixels

Before creating, check if pixels already exist:
```bash
GET https://api.eflow.team/v1/affiliates/pixels
Header: X-Eflow-API-Key: {source_api_key}
# Filter results where network_offer_id == sourceOfferId
# Check if postback_url contains iScale tracking domain
```

If pixels exist for iScale, ask user: **Update existing or skip?**

## Step 6: Create Postback Pixels

### Postback URL Format
```
https://{tracking_domain}/?nid={your_network_id}&transaction_id={sub5}&verification_token={token}&event_id={event_id}
```

- `nid`: iScale network ID (always `{your_network_id}`)
- `transaction_id`: Use `{sub5}` macro (iScale click ID passed through tracking)
- `verification_token`: From Step 3.2
- `event_id`: iScale payout event ID (omit for default/Base event)

### 6.1 Create Base Conversion Pixel
For the default event (is_default: true):
```bash
POST https://api.eflow.team/v1/affiliates/pixels
Header: X-Eflow-API-Key: {source_api_key}
{
  "network_offer_id": sourceOfferId,
  "delivery_method": "postback",
  "pixel_level": "specific",
  "pixel_status": "active",
  "pixel_type": "conversion",
  "postback_url": "https://{domain}/?nid={your_network_id}&transaction_id={sub5}&verification_token={token}"
}
```

### 6.2 Create Post-Conversion Pixels
For each non-default event:
```bash
POST https://api.eflow.team/v1/affiliates/pixels
Header: X-Eflow-API-Key: {source_api_key}
{
  "network_offer_id": sourceOfferId,
  "network_offer_payout_revenue_id": sourceEventId,
  "delivery_method": "postback",
  "pixel_level": "specific",
  "pixel_status": "active",
  "pixel_type": "post_conversion",
  "postback_url": "https://{domain}/?nid={your_network_id}&transaction_id={sub5}&verification_token={token}&event_id={iscaleEventId}"
}
```

## Step 7: Verify Setup

List created pixels:
```bash
GET https://api.eflow.team/v1/affiliates/pixels
Header: X-Eflow-API-Key: {source_api_key}
# Filter by network_offer_id == sourceOfferId
# Verify postback_url contains tracking domain
```

Display summary table:
| Pixel ID | Event | Type | iScale Event ID |
|----------|-------|------|-----------------|
| xxx | Base | conversion | (default) |
| xxx | Event Name | post_conversion | xx |

## Quick Reference

### iScale Configuration
- **Network ID:** `{your_network_id}`
- **Tracking Domain:** `{your_tracking_domain}`
- **Base Postback URL:** `https://{your_tracking_domain}/?nid={your_network_id}&transaction_id={sub5}&verification_token={token}`

### API Endpoints
```bash
# Source network (affiliate)
GET /v1/affiliates/offers/{id}           # Get offer with events
GET /v1/affiliates/pixels                # List pixels
POST /v1/affiliates/pixels               # Create pixel
PUT /v1/affiliates/pixels/{id}           # Update pixel

# iScale (network)
GET /v1/networks/offers/{id}             # Get offer with events
GET /v1/networks/advertisers/{id}        # Check verification token
PATCH /v1/networks/patch/advertiser/apply # Set verification token
POST /v1/networks/tracking/offers/clicks  # Get tracking domain
PATCH /v1/networks/patch/offers/apply     # Set offer visibility
```

### Pixel Types
- `conversion` - Fires on default/base conversion event
- `post_conversion` - Fires on specific payout event (requires `network_offer_payout_revenue_id`)

### Transaction ID Parameter
Use `{sub5}` as the transaction_id macro. This assumes iScale click ID is passed to the source network via sub5 parameter in the tracking link chain.
