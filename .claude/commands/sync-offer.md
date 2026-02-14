description: Sync Everflow offers from affiliate networks to iScale

# Everflow Offer Sync Wizard

You are syncing offers from an affiliate network into iScale Everflow.

## Step 1: Select Source Network

Read the .env.local file in the current directory (or /Users/jasonakatiff/Development/Everflow/.env.local) to find available API keys.

Ask the user which API key to use for pulling offers. Show them the available keys (e.g., TRIMRX_API_KEY, etc.) excluding ISCALE_API_KEY which is always used for pushing.

## Step 2: Select Offer(s)

Fetch available offers from the source network using:
```
GET https://api.eflow.team/v1/affiliates/offersrunnable
Header: X-Eflow-API-Key: {source_api_key}
```

Ask the user:
- Which offer ID to sync (show list of available offers with names)
- Or "all" to sync all offers

## Step 3: Destination Setup

Ask the user:
1. **Create new offer or use existing?**
   - If existing: fetch offers from iScale and let them select which one to update
   - If new: proceed to Step 4

## Step 4: Advertiser Selection (only for new offers)

Fetch advertisers from iScale:
```
GET https://api.eflow.team/v1/networks/advertisers
Header: X-Eflow-API-Key: {ISCALE_API_KEY}
```

Ask the user:
- Use existing advertiser (show list)
- Or create new advertiser (ask for name)

## Step 5: Execute Sync

For each offer being synced:

### 5.1 Fetch Full Offer Data
```
GET https://api.eflow.team/v1/affiliates/offers/{offerId}
```

### 5.2 Get Thumbnail (REQUIRED)

Source network name is derived from the API key name (e.g., TRIMRX_API_KEY → "trimrx", DIRECTMEDS_API_KEY → "directmeds")

**If `thumbnail_url` exists:** Download it to `offers/{source_network}/{offerId}/creatives/`

**If `thumbnail_url` is empty:** Try these fallbacks in order:

1. **Scrape og:image from landing page:**
   ```bash
   curl -sL "{preview_url}" | grep -oP 'property="og:image"[^>]*content="\K[^"]+' | head -1
   ```

2. **Get favicon from domain:**
   ```bash
   # Try common favicon locations
   curl -sI "https://{domain}/favicon.ico"
   curl -sI "https://{domain}/apple-touch-icon.png"
   # Or use Google's favicon service
   curl -o favicon.png "https://www.google.com/s2/favicons?domain={domain}&sz=128"
   ```

3. **Generate placeholder image:**
   ```bash
   # Create a simple placeholder with offer initials using ImageMagick
   magick -size 400x400 xc:"#4A90D9" \
     -gravity center -pointsize 120 -fill white \
     -annotate 0 "{INITIALS}" \
     "offers/{source_network}/{offerId}/creatives/thumbnail.png"
   ```

**Resize to standard dimensions (400x400):**
```bash
magick "{input_image}" -resize 400x400^ -gravity center -extent 400x400 \
  "offers/{source_network}/{offerId}/creatives/thumbnail.png"
```

### 5.3 Fetch Actual Destination URLs (CRITICAL)

The `preview_url` in `relationship.urls.entries[]` is often EMPTY. You MUST fetch the tracking URL for each landing page URL:

```bash
# For each URL in relationship.urls.entries[]
GET https://api.eflow.team/v1/affiliates/offers/{sourceOfferId}/url/{sourceUrlId}
Header: X-Eflow-API-Key: {source_api_key}
# Returns: {"url": "https://www.domain.com/path?_ef_transaction_id=&uid=123&oid=456&affid=789"}
```

Extract the base destination (everything before `?`) from the tracking URL.

Save mapping to `offers/{source_network}/{offerId}/url_mapping.json`:
```json
{
  "123": {
    "name": "1a - Infeed VSL",
    "base_destination": "https://www.example.com/landing",
    "iscale_url_id": 100
  }
}
```

### 5.4 Download Creatives
Download all creative images to `offers/{source_network}/{offerId}/creatives/`

### 5.5 Save Offer Data
Save full offer JSON to `offers/{source_network}/{offerId}/offer.json`

After creating/updating in iScale, save the iScale offer ID to `offers/{source_network}/{offerId}/iscale_offer_id.txt`

### 5.6 Create/Update Offer in iScale

**If creating new:**
1. Upload thumbnail via `/networks/uploads/temp` (base64 encode first)
2. Create offer with `thumbnail_file: {temp_url, original_file_name}` via `POST /networks/offers`
3. Create all offer URLs with correct destinations via `POST /networks/offerurls`:
   ```bash
   POST https://api.eflow.team/v1/networks/offerurls
   {
     "network_offer_id": {iscaleOfferId},
     "name": "{url_name}",
     "destination_url": "{base_destination}?uid={source_url_id}&oid={source_offer_id}&affid={source_affiliate_id}&sub5={transaction_id}",
     "url_status": "active"
   }
   ```
   - `base_destination`: Extracted from source tracking URL (Step 5.3)
   - `uid`: Source URL ID (for attribution)
   - `oid`: Source offer ID
   - `affid`: Your affiliate ID in source network (from your source network account)
   - `sub5={transaction_id}`: iScale click ID token (replaced at redirect)
4. Upload and create each creative via `POST /networks/creatives`

**If updating existing:**
1. Upload new thumbnail via `/networks/uploads/temp`
2. Update offer fields via `PUT /networks/offers/{id}` with `thumbnail_file`
3. Add missing URLs / update existing
4. Add missing creatives

### 5.7 Apply Geo Targeting (REQUIRED)
Use bulk edit PATCH to set country/region targeting:
```
PATCH https://api.eflow.team/v1/networks/patch/offers/apply
{
  "network_offer_ids": [offerId],
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

Also try dedicated targeting endpoint:
```
PUT https://api.eflow.team/v1/networks/offers/{offerId}/targeting
{
  "countries": [{"country_id": 227, "country_code": "US", "targeting_type": "include", "match_type": "exact"}],
  "regions": [{"region_id": 1501, "region_code": "MS", "targeting_type": "exclude", "match_type": "exact"}]
}
```

### 5.8 Create Custom Payout Rules (REQUIRED if source has them)
For each custom payout in source `relationship.custom_payout_settings.entries`:
```
POST https://api.eflow.team/v1/networks/custom/payoutrevenue
{
  "network_offer_id": offerId,
  "network_offer_payout_revenue_id": purchasePayoutId,
  "name": "Rule Name",
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
  "network_offer_url_ids": [urlId1, urlId2]
}
```

Map source URL IDs to new iScale URL IDs by matching names.

### 5.9 Setup Postbacks (REQUIRED)

Create affiliate pixels in the source network to fire conversions to iScale.

**Step 1: Get iScale tracking domain**
```bash
# Temporarily set offer to public
PATCH https://api.eflow.team/v1/networks/patch/offers/apply
Header: X-Eflow-API-Key: {ISCALE_API_KEY}
{"network_offer_ids": [iscaleOfferId], "fields": [{"field_type": "visibility", "field_value": "public"}]}

# Generate tracking link to get domain
POST https://api.eflow.team/v1/networks/tracking/offers/clicks
Header: X-Eflow-API-Key: {ISCALE_API_KEY}
{"network_offer_id": iscaleOfferId, "network_affiliate_id": 1}
# Response: {"url": "https://www.{tracking_domain}.com/..."}

# Reset visibility
PATCH https://api.eflow.team/v1/networks/patch/offers/apply
{"network_offer_ids": [iscaleOfferId], "fields": [{"field_type": "visibility", "field_value": "require_approval"}]}
```

**Step 2: Set advertiser verification token** (if not already set)
```bash
PATCH https://api.eflow.team/v1/networks/patch/advertiser/apply
Header: X-Eflow-API-Key: {ISCALE_API_KEY}
{
  "network_advertiser_ids": [advertiserId],
  "fields": [{"field_type": "verification_token", "field_value": "{source_network}_iscale_2025"}]
}
```

**Step 3: Create pixels in source network**

Postback URL format:
```
https://{tracking_domain}/?nid={your_network_id}&transaction_id={sub5}&verification_token={token}&event_id={event_id}
```

For each payout event in the source offer:
```bash
# Base conversion (default event - no event_id needed)
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

# Post-conversion events (include event_id for iScale)
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

**Event ID Mapping**: Match source event `entry_name` to iScale event IDs from `relationship.payout_revenue.entries[]`.

### 5.10 Verify Sync
Query iScale API to verify:
- [ ] Offer exists with correct name/description
- [ ] Thumbnail uploaded (check `thumbnail_url` not empty)
- [ ] All URLs created (compare counts)
- [ ] All creatives created
- [ ] Geo targeting applied (may show null in API but still work)
- [ ] Custom payout rules created (query `/networks/custom/payoutrevenue?network_offer_id=X`)
- [ ] Postback pixels created in source network (query `/affiliates/pixels`)

## Sync Checklist

Always sync these components:
1. **Basic Info**: name, description, preview_url, destination_url, visibility
2. **Thumbnail**: Upload and attach to offer
3. **Payout Events**: All conversion events with amounts
4. **Landing Page URLs**: All URLs with correct destinations
5. **Creatives**: All creative assets (images, links)
6. **Geo Targeting**: Countries (include) and regions (exclude)
7. **Custom Payout Rules**: URL-specific payout overrides
8. **Postback Pixels**: Create in source network to fire conversions to iScale

## Important Notes

- Always use `ISCALE_API_KEY` for pushing to iScale
- **Destination URLs**: `preview_url` in URL entries is often EMPTY - must fetch via `GET /affiliates/offers/{id}/url/{urlId}`
- **URL format**: Always include tracking params: `?uid={source_url_id}&oid={source_offer_id}&affid={affid}&sub5={transaction_id}`
- For PUT requests to offers, include `payout_revenue` array with `is_default: true` entry
- Geo targeting via PATCH returns `true` but may not show in GET response - that's OK
- Custom payouts REQUIRE: `is_custom_payout_enabled: true`, `name`, `custom_setting_status: "active"`
- Can't DELETE offer URLs - use PUT with `url_status: "deleted"`
- File uploads: base64 encode → POST `/networks/uploads/temp` → use temp_url in payload

## API Reference

- Base URL: `https://api.eflow.team/v1`
- Auth Header: `X-Eflow-API-Key: {key}`
- Affiliate endpoints: `/affiliates/...`
- Network endpoints: `/networks/...`
