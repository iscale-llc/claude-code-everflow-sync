# Everflow Offer Sync

Sync offers from affiliate networks into iScale Everflow network.

## Available Commands

| Command | Description |
|---------|-------------|
| `/sync-offer` | Full offer sync (all data, creatives, URLs, geo, payouts) |
| `/sync-links` | Sync only landing page URLs for existing offers |
| `/sync-rules` | Sync only custom payout rules for existing offers |

### When to use each:
- **New offer?** → `/sync-offer`
- **URLs changed?** → `/sync-links`
- **Payouts changed?** → `/sync-rules`

## Environment Variables (.env.local)

```bash
ISCALE_API_KEY=xxx          # iScale network API (always push target)
TRIMRX_API_KEY=xxx          # TrimRX affiliate API
DIRECTMEDS_API_KEY=xxx      # DirectMeds affiliate API
# Add more source network keys as: {NETWORK}_API_KEY=xxx
```

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
3. **Payout Events**: All conversion events with amounts
4. **Landing Page URLs**: All URLs with correct destinations
5. **Creatives**: All creative assets
6. **Geo Targeting**: Countries + regions via PATCH or PUT /targeting
7. **Custom Payout Rules**: URL-specific payout overrides

## API Cheatsheet

### Affiliate (Source) Endpoints
```bash
# List runnable offers
GET /v1/affiliates/offersrunnable

# Get offer details
GET /v1/affiliates/offers/{id}

# Get tracking URL (destination is in preview_url of offer data)
GET /v1/affiliates/offers/{id}/url/{urlId}
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
```

## Key Gotchas

1. **Destination URLs**: Use `preview_url` from offer's `relationship.urls.entries[]`

2. **PUT requires full payload**: Include `payout_revenue` array with one `is_default: true` entry

3. **Thumbnail upload**:
```bash
# 1. Base64 encode image
base64 -i logo.png > logo_b64.txt

# 2. Upload to temp
POST /v1/networks/uploads/temp
{"content": "<base64>", "file_type": "image/png", "file_name": "logo.png"}
# Returns: {"urls": [{"url": "https://...temp/uuid"}]}

# 3. Use in offer create/update
"thumbnail_file": {"temp_url": "https://...temp/uuid", "original_file_name": "logo.png"}
```

4. **Geo targeting via PATCH**:
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

5. **Geo targeting via PUT** (alternative):
```bash
PUT /v1/networks/offers/{id}/targeting
{
  "countries": [{"country_id": 227, "country_code": "US", "targeting_type": "include", "match_type": "exact"}],
  "regions": [{"region_id": 1501, "region_code": "MS", "targeting_type": "exclude", "match_type": "exact"}]
}
```

6. **Custom payout rules** (REQUIRED fields):
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
| relationship.payouts | payout_revenue[] |
| relationship.creatives | POST /networks/creatives |
| relationship.urls | POST /networks/offerurls |
| relationship.ruleset.countries | PATCH ruleset_countries or PUT /targeting |
| relationship.ruleset.regions | PATCH ruleset_regions or PUT /targeting |
| relationship.custom_payout_settings | POST /networks/custom/payoutrevenue |

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
```
