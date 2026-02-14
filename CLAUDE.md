# Everflow Offer Sync

Sync offers from affiliate networks into iScale Everflow network.

> **ON LOAD**: Read `.env.local` to get actual configuration values (API keys, network IDs, tracking domain, affiliate IDs, verification tokens). Use these real values when executing sync commands instead of the placeholders in this documentation.

## Available Commands

| Command | Description |
|---------|-------------|
| `/setup` | Initial configuration wizard (API keys, network IDs, tokens) |
| `/sync-offer` | Full offer sync (all data, creatives, URLs, geo, payouts, postbacks) |
| `/sync-links` | Sync only landing page URLs for existing offers |
| `/sync-rules` | Sync only custom payout rules for existing offers |
| `/sync-postbacks` | Setup postback pixels in source network to fire to iScale |

### When to use each:
- **First time?** → `/setup`
- **New offer?** → `/sync-offer`
- **URLs changed?** → `/sync-links`
- **Payouts changed?** → `/sync-rules`
- **Postbacks missing?** → `/sync-postbacks`

## Environment Variables (.env.local)

```bash
# API Keys
ISCALE_API_KEY=xxx                    # Destination network API (always push target)
{NETWORK}_API_KEY=xxx                 # Source network APIs (e.g., ACME_API_KEY)

# iScale Configuration
ISCALE_NETWORK_ID=xxx                 # Your iScale network ID (nid parameter)
ISCALE_TRACKING_DOMAIN=xxx            # Your tracking domain (e.g., www.example.com)
ISCALE_PAYOUT_MARGIN=0.20             # Margin to keep (0.20 = 20%, affiliates get 80%)

# Per-Network Configuration (for each source network)
{NETWORK}_AFFILIATE_ID=xxx            # Your affiliate ID in source network
{NETWORK}_ADVERTISER_ID=xxx           # Advertiser ID for this network in iScale
{NETWORK}_VERIFICATION_TOKEN=xxx      # Postback verification token
```

When syncing, use these values:
- **Postback URL**: `https://{ISCALE_TRACKING_DOMAIN}/?nid={ISCALE_NETWORK_ID}&transaction_id={sub5}&verification_token={NETWORK_VERIFICATION_TOKEN}`
- **URL Destination**: `{base_url}?uid={source_url_id}&oid={source_offer_id}&affid={NETWORK_AFFILIATE_ID}&sub5={transaction_id}`

## Directory Structure

```
offers/
  {source_network}/           # e.g., trimrx, directmeds
    {offerId}/
      offer.json              # Full offer data from source
      url_mapping.json        # URL names → destination URLs
      creatives/              # Downloaded creative images (including thumbnail)
      create_payload.json     # Payload used to create in iScale
      iscale_offer_id.txt     # ID of created offer in iScale (for reference)
```

Example:
```
offers/
  trimrx/
    1/
      offer.json
      creatives/
  directmeds/
    12/
      offer.json
      creatives/
```

## Sync Checklist (REQUIRED)

Every sync MUST include:
1. **Basic Info**: name, description, preview_url, destination_url, visibility
2. **Thumbnail**: Download, upload to temp, attach via `thumbnail_file`
3. **Payout Events**: All conversion events with amounts **applying payout margin** (revenue = source payout, payout = source × (1 - ISCALE_PAYOUT_MARGIN))
4. **Landing Page URLs**: All URLs with correct destinations
5. **Creatives**: All creative assets
6. **Geo Targeting**: Countries + regions via PATCH or PUT /targeting
7. **Custom Payout Rules**: URL-specific payout overrides (also apply margin)
8. **Postback Setup**: Create affiliate pixels in source network to fire to iScale

## API Cheatsheet

### Affiliate (Source) Endpoints
```bash
# List runnable offers
GET /v1/affiliates/offersrunnable

# Get offer details
GET /v1/affiliates/offers/{id}

# Get tracking URL (destination is in preview_url of offer data)
GET /v1/affiliates/offers/{id}/url/{urlId}

# Postback pixels (for setting up conversion firing)
GET /v1/affiliates/pixels                    # List all pixels
POST /v1/affiliates/pixels                   # Create new pixel
PUT /v1/affiliates/pixels/{pixelId}          # Update pixel
```

### Network (iScale) Endpoints
```bash
# Offers
GET/POST/PUT /v1/networks/offers
PATCH /v1/networks/patch/offers/apply  # Bulk edit

# Geo Targeting (use BOTH for reliability)
PATCH /v1/networks/patch/offers/apply  # field_type: ruleset_countries, ruleset_regions
PUT /v1/networks/offers/{id}/targeting  # {countries: [...], regions: [...]}

# Creatives
GET/POST /v1/networks/creatives

# Offer URLs
GET/POST/PUT /v1/networks/offerurls
# Note: No DELETE - use PUT with url_status: "deleted"

# Custom Payouts
GET/POST/PUT /v1/networks/custom/payoutrevenue

# File Upload
POST /v1/networks/uploads/temp  # Returns temp_url for use in creates

# Tracking Links (to discover tracking domain)
POST /v1/networks/tracking/offers/clicks  # Returns tracking URL with domain

# Advertisers (for verification tokens)
GET /v1/networks/advertisers/{id}
PATCH /v1/networks/patch/advertiser/apply  # Set verification_token
```

## Key Gotchas

1. **Destination URLs**: The `preview_url` in `relationship.urls.entries[]` is often EMPTY. You MUST fetch the actual tracking URL for each URL:
```bash
# Get tracking URL for a specific landing page URL
GET /v1/affiliates/offers/{offerId}/url/{urlId}
# Returns: {"url": "https://www.domain.com/path?_ef_transaction_id=&uid=123&oid=456&affid=789"}

# Extract base destination (before ?) and use it with iScale tracking params
```

2. **URL Destination Format** (CRITICAL): When creating URLs in iScale, use this format:
```
{base_destination}?uid={source_url_id}&oid={source_offer_id}&affid={source_affiliate_id}&sub5={transaction_id}
```
- `uid`: Source network URL ID (for attribution back to source)
- `oid`: Source network offer ID
- `affid`: Source network affiliate ID (your affiliate ID in source network)
- `sub5`: iScale transaction ID token (replaced at redirect time)

Example:
```
https://www.example.com/landing?uid=123&oid=456&affid=789&sub5={transaction_id}
```

3. **PUT requires full payload**: Include `payout_revenue` array with one `is_default: true` entry

4. **Thumbnail handling** (with fallbacks if missing):

**If source has thumbnail:** Download and resize
**If no thumbnail:** Try in order:
1. Scrape `og:image` from landing page
2. Get favicon from domain (try `/favicon.ico`, `/apple-touch-icon.png`, or Google favicon API)
3. Generate placeholder with offer initials

```bash
# Resize/crop to 400x400 (standard thumbnail size)
magick "{input}" -resize 400x400^ -gravity center -extent 400x400 thumbnail.png

# Generate placeholder (if no image found)
magick -size 400x400 xc:"#4A90D9" -gravity center -pointsize 120 -fill white \
  -annotate 0 "AB" thumbnail.png

# Get favicon via Google API
curl -o favicon.png "https://www.google.com/s2/favicons?domain={domain}&sz=128"
```

**Upload to Everflow:**
```bash
# 1. Base64 encode image
base64 -i thumbnail.png > thumb_b64.txt

# 2. Upload to temp
POST /v1/networks/uploads/temp
{"content": "<base64>", "file_type": "image/png", "file_name": "thumbnail.png"}
# Returns: {"urls": [{"url": "https://...temp/uuid"}]}

# 3. Use in offer create/update
"thumbnail_file": {"temp_url": "https://...temp/uuid", "original_file_name": "logo.png"}
```

5. **Geo targeting via PATCH**:
```json
{
  "network_offer_ids": [4],
  "fields": [
    {
      "field_type": "ruleset_countries",
      "field_value": [{"country_id": 227, "match_type": "exact", "targeting_type": "include", "label": "United States"}],
      "operator": "overwrite"
    },
    {
      "field_type": "ruleset_regions",
      "field_value": [{"region_id": 1501, "targeting_type": "exclude", "match_type": "exact", "label": "Mississippi (US)"}],
      "operator": "overwrite"
    }
  ]
}
```
Note: Returns `true` but GET may still show `null` - targeting is applied anyway.

6. **Geo targeting via PUT** (alternative):
```bash
PUT /v1/networks/offers/{id}/targeting
{
  "countries": [{"country_id": 227, "country_code": "US", "targeting_type": "include", "match_type": "exact"}],
  "regions": [{"region_id": 1501, "region_code": "MS", "targeting_type": "exclude", "match_type": "exact"}]
}
```

7. **Custom payout rules** (REQUIRED fields):
```json
{
  "network_offer_id": 4,
  "network_offer_payout_revenue_id": 51,
  "name": "Upsells URLs $290",
  "custom_setting_status": "active",
  "is_apply_all_affiliates": true,
  "is_custom_payout_enabled": true,
  "payout_amount": 290,
  "payout_percentage": 0,
  "payout_type": "cpa",
  "is_custom_revenue_enabled": false,
  "revenue_amount": 0,
  "revenue_percentage": 0,
  "revenue_type": "blank",
  "is_apply_specific_offer_urls": true,
  "network_offer_url_ids": [104, 105]
}
```

8. **Postback URL param is `event_id` NOT `adv_event_id`**: Everflow advertiser postbacks use `event_id` for the event parameter. Never use `adv_event_id` — it will silently fail.

9. **Postback Setup** (for firing conversions to iScale):

The Everflow API does NOT directly expose postback URLs. To set up postbacks:

**Step 1: Get iScale tracking domain** (generate a tracking link):
```bash
# Temporarily set offer visibility to public
PATCH /v1/networks/patch/offers/apply
{"network_offer_ids": [offerId], "fields": [{"field_type": "visibility", "field_value": "public"}]}

# Generate tracking link to discover domain
POST /v1/networks/tracking/offers/clicks
{"network_offer_id": offerId, "network_affiliate_id": 1}
# Returns: {"url": "https://www.{tracking_domain}.com/..."}

# Reset visibility
PATCH /v1/networks/patch/offers/apply
{"network_offer_ids": [offerId], "fields": [{"field_type": "visibility", "field_value": "require_approval"}]}
```

**Step 2: Set advertiser verification token**:
```bash
PATCH /v1/networks/patch/advertiser/apply
{
  "network_advertiser_ids": [advertiserId],
  "fields": [{"field_type": "verification_token", "field_value": "{network}_iscale_2025"}]
}
```

**Step 3: Build postback URL format**:
```
https://{tracking_domain}/?nid={network_id}&transaction_id={sub5}&verification_token={token}&event_id={event_id}
```
- `nid`: iScale network ID ({your_network_id})
- `transaction_id`: Use `{sub5}` macro (iScale click ID passed through)
- `verification_token`: The token set in Step 2
- `event_id`: iScale payout event ID (omit for default/Base event)

> **CRITICAL: The parameter is `event_id`, NOT `adv_event_id`.** This matches what Everflow generates in advertiser postback URLs. Using the wrong param name will silently break event tracking. Never use `adv_event_id`.

**Step 4: Create pixels in source network**:
```bash
# Base conversion pixel
POST /v1/affiliates/pixels (using SOURCE network API key)
{
  "network_offer_id": sourceOfferId,
  "delivery_method": "postback",
  "pixel_level": "specific",
  "pixel_status": "active",
  "pixel_type": "conversion",
  "postback_url": "https://{domain}/?nid={your_network_id}&transaction_id={sub5}&verification_token={token}"
}

# Post-conversion events (for each non-default event)
POST /v1/affiliates/pixels
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

**Event ID Mapping**: Map source payout event names to iScale event IDs by matching `entry_name`.

## iScale Configuration

> **Values loaded from `.env.local`**: `ISCALE_NETWORK_ID`, `ISCALE_TRACKING_DOMAIN`, `ISCALE_PAYOUT_MARGIN`

| Setting | Env Variable | Default |
|---------|-------------|---------|
| Network ID (nid) | `ISCALE_NETWORK_ID` | - |
| Tracking Domain | `ISCALE_TRACKING_DOMAIN` | - |
| Payout Margin | `ISCALE_PAYOUT_MARGIN` | 0.20 |

### Payout Margin (REQUIRED)

When syncing offers, **always apply the payout margin** to affiliate payouts:
- `revenue_amount` = Source payout (what we receive from source network)
- `payout_amount` = Source payout × (1 - margin) (what we pay affiliates)

**Example** with 20% margin (`ISCALE_PAYOUT_MARGIN=0.20`):
- Source pays $350 → Revenue: $350, Payout: $280 (we keep $70)

**Postback URL Format:**
```
https://{ISCALE_TRACKING_DOMAIN}/?nid={ISCALE_NETWORK_ID}&transaction_id={sub5}&verification_token={token}&event_id={event_id}
```

## Source Network Configuration

> **Values loaded from `.env.local`**: `{NETWORK}_AFFILIATE_ID`, `{NETWORK}_ADVERTISER_ID`, `{NETWORK}_VERIFICATION_TOKEN`

Each source network has configuration in `.env.local`:
- `{NETWORK}_AFFILIATE_ID` - Your affiliate ID in that network (used in URL params)
- `{NETWORK}_ADVERTISER_ID` - The advertiser ID in iScale for this network's offers
- `{NETWORK}_VERIFICATION_TOKEN` - Token for authenticating postbacks

### URL Destination Format

```
{base_url}?uid={source_url_id}&oid={source_offer_id}&affid={NETWORK_AFFILIATE_ID}&sub5={transaction_id}
```

## Common Region/Country IDs

### Countries
- US (United States): 227
- PR (Puerto Rico): 177
- CA (Canada): 39

### US Regions (for exclusions)
- MS (Mississippi): 1501
- LA (Louisiana): 1420

## Data Mapping

| Source (Affiliate) | Target (Network) |
|-------------------|------------------|
| name | name |
| html_description | html_description |
| preview_url | preview_url |
| thumbnail_url | thumbnail_file (download, upload to temp first) |
| relationship.payouts.payout_amount | revenue_amount (what we receive) |
| relationship.payouts.payout_amount × (1 - margin) | payout_amount (what affiliates receive) |
| relationship.creatives | POST /networks/creatives |
| relationship.urls | POST /networks/offerurls |
| relationship.ruleset.countries | PATCH ruleset_countries or PUT /targeting |
| relationship.ruleset.regions | PATCH ruleset_regions or PUT /targeting |
| relationship.custom_payout_settings | POST /networks/custom/payoutrevenue |
| relationship.payouts.entries[] | POST /affiliates/pixels (postbacks to iScale) |

## Verification Queries

After sync, verify with:
```bash
# Check offer
GET /v1/networks/offers/{id}

# Check URLs
GET /v1/networks/offerurls  # filter by network_offer_id

# Check creatives
GET /v1/networks/creatives  # filter by network_offer_id

# Check custom payouts
GET /v1/networks/custom/payoutrevenue?network_offer_id={id}

# Check postback pixels (in SOURCE network)
GET /v1/affiliates/pixels  # filter by network_offer_id, check postback_url contains tracking domain
```
