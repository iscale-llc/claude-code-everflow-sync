description: Sync landing page URLs for existing offers from affiliate networks to iScale

# Everflow Link Sync

Sync landing page URLs from a source affiliate network to an existing iScale offer.

## Step 1: Select Source Network

Read `.env.local` to find available API keys. Ask user which source network to pull from (excluding ISCALE_API_KEY).

## Step 2: Select Offer(s)

Check `offers/{source_network}/` for existing synced offers (folders with `iscale_offer_id.txt`).

Ask user:
- Which offer to sync links for (show list with source offer ID and iScale offer ID)
- Or "all" to sync all offers for that network

## Step 3: Fetch Source URLs

For each offer being synced:

```bash
# Get full offer data with URLs
GET https://api.eflow.team/v1/affiliates/offers/{sourceOfferId}
Header: X-Eflow-API-Key: {source_api_key}
```

Extract URL IDs and names from `relationship.urls.entries[]`:
- `network_offer_url_id` - source URL ID
- `name` - URL name
- `preview_url` - often EMPTY, do not rely on this

**CRITICAL**: Fetch actual destination for each URL:
```bash
# For each URL entry
GET https://api.eflow.team/v1/affiliates/offers/{sourceOfferId}/url/{sourceUrlId}
Header: X-Eflow-API-Key: {source_api_key}
# Returns: {"url": "https://www.domain.com/path?_ef_transaction_id=&uid=123&oid=456&affid=789"}
```

Extract the base destination (everything before `?`) from the tracking URL.

## Step 4: Get Existing iScale URLs

```bash
# Get current URLs in iScale
GET https://api.eflow.team/v1/networks/offerurls
Header: X-Eflow-API-Key: {ISCALE_API_KEY}
```

Filter by `network_offer_id` matching the iScale offer ID.

## Step 5: Sync URLs

Compare source URLs to iScale URLs by name:

### New URLs (in source, not in iScale)
```bash
POST https://api.eflow.team/v1/networks/offerurls
{
  "network_offer_id": {iscaleOfferId},
  "name": "{url_name}",
  "destination_url": "{base_destination}?uid={source_url_id}&oid={source_offer_id}&affid={source_affiliate_id}&sub5={transaction_id}",
  "url_status": "active"
}
```

### Updated URLs (name exists, destination changed)
```bash
PUT https://api.eflow.team/v1/networks/offerurls/{urlId}
{
  "network_offer_url_id": {urlId},
  "network_offer_id": {iscaleOfferId},
  "name": "{url_name}",
  "destination_url": "{base_destination}?uid={source_url_id}&oid={source_offer_id}&affid={source_affiliate_id}&sub5={transaction_id}",
  "url_status": "active"
}
```

### Removed URLs (in iScale, not in source)
Ask user if they want to deactivate removed URLs:
```bash
PUT https://api.eflow.team/v1/networks/offerurls/{urlId}
{
  "network_offer_url_id": {urlId},
  "network_offer_id": {iscaleOfferId},
  "name": "{url_name}",
  "destination_url": "{existing_destination}",
  "url_status": "deleted"
}
```

## Step 6: Update URL Mapping

Save updated mapping to `offers/{source_network}/{offerId}/url_mapping.json`:
```json
{
  "123": {
    "name": "1a - Infeed VSL",
    "base_destination": "https://www.example.com/landing",
    "full_destination": "https://www.example.com/landing?uid=123&oid=456&affid=789&sub5={transaction_id}",
    "iscale_url_id": 100
  }
}
```

## Step 7: Verify & Report

Show summary:
- URLs added: X
- URLs updated: X
- URLs deactivated: X
- URLs unchanged: X

Query iScale to verify URL count matches.

## URL Destination Format

When creating/updating URLs in iScale, use this format:
```
{base_destination}?uid={source_url_id}&oid={source_offer_id}&affid={source_affiliate_id}&sub5={transaction_id}
```

Parameters:
- `base_destination`: Extracted from source tracking URL (before `?`)
- `uid`: Source network URL ID (for attribution back to source)
- `oid`: Source network offer ID
- `affid`: Your affiliate ID in source network (from your source network account)
- `sub5={transaction_id}`: iScale click ID token (replaced at redirect time)

Example:
```
https://www.example.com/landing?uid=123&oid=456&affid=789&sub5={transaction_id}
```

## Notes

- URL names are used as the matching key between source and iScale
- **Destination URLs**: `preview_url` in URL entries is often EMPTY - must fetch via `GET /affiliates/offers/{id}/url/{urlId}`
- **Always include tracking params**: `?uid={source_url_id}&oid={source_offer_id}&affid={affid}&sub5={transaction_id}`
- Can't DELETE URLs in Everflow - use `url_status: "deleted"` instead
- Always preserve existing URL IDs when updating (don't recreate)
- Custom payout rules reference URL IDs - updating URLs preserves these associations
