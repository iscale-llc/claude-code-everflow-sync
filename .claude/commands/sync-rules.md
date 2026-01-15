description: Sync custom payout rules from affiliate networks to iScale

# Everflow Payout Rules Sync

Sync custom payout rules from a source affiliate network to an existing iScale offer.

## Step 1: Select Source Network

Read `.env.local` to find available API keys. Ask user which source network to pull from (excluding ISCALE_API_KEY).

## Step 2: Select Offer(s)

Check `offers/{source_network}/` for existing synced offers (folders with `iscale_offer_id.txt`).

Ask user:
- Which offer to sync rules for (show list with source offer ID and iScale offer ID)
- Or "all" to sync all offers for that network

## Step 3: Fetch Source Custom Payouts

For each offer being synced:

```bash
GET https://api.eflow.team/v1/affiliates/offers/{sourceOfferId}
Header: X-Eflow-API-Key: {source_api_key}
```

Extract custom payouts from `relationship.custom_payout_settings.entries[]`:
- `payout_amount` - custom payout amount
- `payout_type` - typically "cpa"
- `relationship.network_offer_url_ids` - which URLs this applies to
- `relationship.offer_urls[].name` - URL names for matching

## Step 4: Get iScale Data

Fetch both existing rules and URL mappings:

```bash
# Get existing custom payouts
GET https://api.eflow.team/v1/networks/custom/payoutrevenue?network_offer_id={iscaleOfferId}
Header: X-Eflow-API-Key: {ISCALE_API_KEY}

# Get offer URLs for ID mapping
GET https://api.eflow.team/v1/networks/offerurls
# Filter by network_offer_id

# Get default payout ID
GET https://api.eflow.team/v1/networks/offers/{iscaleOfferId}
# Get network_offer_payout_revenue_id where is_default=true from relationship.payout_revenue.entries[]
```

## Step 5: Map Source URLs to iScale URLs

Match source URL names to iScale URL IDs:
```
Source URL 71 "Quiz V2 - With Upsells" → iScale URL 104
Source URL 78 "Direct to Questionnaire - With Upsells" → iScale URL 105
```

## Step 6: Sync Rules

### Create New Rules
For each source custom payout that doesn't exist in iScale (match by payout amount + URL IDs):

```bash
POST https://api.eflow.team/v1/networks/custom/payoutrevenue
{
  "network_offer_id": {iscaleOfferId},
  "network_offer_payout_revenue_id": {defaultPayoutId},
  "name": "{descriptive_name}",
  "custom_setting_status": "active",
  "is_apply_all_affiliates": true,
  "is_custom_payout_enabled": true,
  "payout_amount": {amount},
  "payout_percentage": 0,
  "payout_type": "cpa",
  "is_custom_revenue_enabled": false,
  "revenue_amount": 0,
  "revenue_percentage": 0,
  "revenue_type": "blank",
  "is_apply_specific_offer_urls": true,
  "network_offer_url_ids": [{mapped_iscale_url_ids}]
}
```

### Update Existing Rules
For rules that exist but have different amounts:

```bash
PUT https://api.eflow.team/v1/networks/custom/payoutrevenue/{ruleId}
{
  "network_custom_payout_revenue_setting_id": {ruleId},
  "network_offer_id": {iscaleOfferId},
  "network_offer_payout_revenue_id": {defaultPayoutId},
  "name": "{name}",
  "custom_setting_status": "active",
  "is_apply_all_affiliates": true,
  "is_custom_payout_enabled": true,
  "payout_amount": {new_amount},
  "payout_percentage": 0,
  "payout_type": "cpa",
  "is_custom_revenue_enabled": false,
  "revenue_amount": 0,
  "revenue_percentage": 0,
  "revenue_type": "blank",
  "is_apply_specific_offer_urls": true,
  "network_offer_url_ids": [{url_ids}]
}
```

### Deactivate Removed Rules
For rules in iScale that no longer exist in source:

```bash
PUT https://api.eflow.team/v1/networks/custom/payoutrevenue/{ruleId}
{
  ...existing fields...,
  "custom_setting_status": "deleted"
}
```

## Step 7: Verify & Report

Show summary:
- Rules added: X
- Rules updated: X
- Rules deactivated: X
- Rules unchanged: X

Query to verify:
```bash
GET https://api.eflow.team/v1/networks/custom/payoutrevenue?network_offer_id={iscaleOfferId}
```

## Rule Naming Convention

Generate descriptive names based on URLs and amount:
- `"Upsells URLs $290"` - for upsell-related URLs at $290
- `"Split Test $300"` - for split test URLs at $300
- `"{URL_name} ${amount}"` - fallback format

## Required Fields for Custom Payouts

These fields are REQUIRED or the API will reject:
- `network_offer_id`
- `network_offer_payout_revenue_id` (the default payout event ID)
- `name`
- `custom_setting_status`: "active"
- `is_custom_payout_enabled`: true
- `payout_amount`
- `payout_type`: "cpa"
- `is_custom_revenue_enabled`: false
- `revenue_type`: "blank"

## Notes

- Custom payouts apply to the default payout event (usually "Purchase" or "Sale")
- Rules without specific URLs (general overrides) are typically skipped since they'd just duplicate the default
- URL ID mapping is critical - rules reference specific URL IDs
- Run `/sync-links` first if URLs haven't been synced yet
