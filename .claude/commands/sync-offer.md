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

### 5.2 Download Thumbnail (REQUIRED)
Download the thumbnail image from `thumbnail_url` to `offers/{source_network}/{offerId}/creatives/`

Source network name is derived from the API key name (e.g., TRIMRX_API_KEY → "trimrx", DIRECTMEDS_API_KEY → "directmeds")

### 5.3 Fetch Actual Destination URLs
For each URL in the offer, the preview_url contains the destination. Save mapping to `offers/{source_network}/{offerId}/url_mapping.json`

### 5.4 Download Creatives
Download all creative images to `offers/{source_network}/{offerId}/creatives/`

### 5.5 Save Offer Data
Save full offer JSON to `offers/{source_network}/{offerId}/offer.json`

After creating/updating in iScale, save the iScale offer ID to `offers/{source_network}/{offerId}/iscale_offer_id.txt`

### 5.6 Create/Update Offer in iScale

**If creating new:**
1. Upload thumbnail via `/networks/uploads/temp` (base64 encode first)
2. Create offer with `thumbnail_file: {temp_url, original_file_name}` via `POST /networks/offers`
3. Create all offer URLs with correct destinations via `POST /networks/offerurls`
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

### 5.9 Verify Sync
Query iScale API to verify:
- [ ] Offer exists with correct name/description
- [ ] Thumbnail uploaded (check `thumbnail_url` not empty)
- [ ] All URLs created (compare counts)
- [ ] All creatives created
- [ ] Geo targeting applied (may show null in API but still work)
- [ ] Custom payout rules created (query `/networks/custom/payoutrevenue?network_offer_id=X`)

## Sync Checklist

Always sync these components:
1. **Basic Info**: name, description, preview_url, destination_url, visibility
2. **Thumbnail**: Upload and attach to offer
3. **Payout Events**: All conversion events with amounts
4. **Landing Page URLs**: All URLs with correct destinations
5. **Creatives**: All creative assets (images, links)
6. **Geo Targeting**: Countries (include) and regions (exclude)
7. **Custom Payout Rules**: URL-specific payout overrides

## Important Notes

- Always use `ISCALE_API_KEY` for pushing to iScale
- Affiliate API doesn't expose destination URLs directly - use preview_url from offer data
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
