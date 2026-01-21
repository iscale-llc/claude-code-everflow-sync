description: Initial setup wizard for Everflow sync configuration

# Everflow Sync Setup Wizard

Guide the user through setting up their `.env.local` configuration file.

## Step 1: Check Existing Configuration

Check if `.env.local` exists:
```bash
cat .env.local 2>/dev/null || echo "No .env.local found"
```

If exists, show current config and ask if they want to update it or start fresh.

## Step 2: Gather iScale (Destination) Configuration

Ask user for their iScale network credentials:

1. **ISCALE_API_KEY**: "What is your iScale network API key?"
   - Found in: Everflow → Settings → API Keys

2. **ISCALE_NETWORK_ID**: "What is your iScale network ID?"
   - Found in: URL when logged in (e.g., `https://yournetwork.everflowclient.io/networks/1234/...`)
   - Or via API: `GET /v1/networks/settings` returns `network_id`

3. **ISCALE_TRACKING_DOMAIN**: "What is your iScale tracking domain?"
   - To discover: Generate any tracking link and extract the domain
   - Or ask user to check their Everflow tracking domain settings

## Step 3: Gather Source Network(s) Configuration

Ask: "Which source networks do you want to configure?"

For each source network, gather:

### 3.1 Network Name
"What should we call this network?" (e.g., BCOMMERCE, TRIMRX, DIRECTMEDS)
- This becomes the prefix for all env vars: `{NETWORK}_API_KEY`, etc.

### 3.2 API Key
"What is your affiliate API key for {NETWORK}?"
- Found in: Source network → Settings → API Keys (affiliate section)

### 3.3 Affiliate ID
"What is your affiliate ID in {NETWORK}?"
- To discover via API:
```bash
GET https://api.eflow.team/v1/affiliates/settings
Header: X-Eflow-API-Key: {network_api_key}
# Returns: network_affiliate_id
```

### 3.4 Advertiser ID (in iScale)
"What advertiser ID should offers from {NETWORK} be assigned to in iScale?"
- List existing advertisers:
```bash
GET https://api.eflow.team/v1/networks/advertisers
Header: X-Eflow-API-Key: {ISCALE_API_KEY}
```
- Or create new advertiser if needed

### 3.5 Verification Token
"What verification token should we use for {NETWORK} postbacks?"
- Suggest format: `{network_lowercase}_iscale_{year}` (e.g., `acme_iscale_2025`)
- This will be set on the advertiser in iScale

## Step 4: Write Configuration

Create/update `.env.local`:

```bash
# ========================================
# API KEYS
# ========================================

# Source Networks (pull offers from)
{NETWORK1}_API_KEY={api_key}
{NETWORK2}_API_KEY={api_key}

# Destination Network (push offers to)
ISCALE_API_KEY={iscale_api_key}

# ========================================
# ISCALE CONFIGURATION
# ========================================
ISCALE_NETWORK_ID={network_id}
ISCALE_TRACKING_DOMAIN={tracking_domain}

# ========================================
# SOURCE NETWORK CONFIGURATION
# ========================================

# {NETWORK1}
{NETWORK1}_AFFILIATE_ID={affiliate_id}
{NETWORK1}_ADVERTISER_ID={advertiser_id}
{NETWORK1}_VERIFICATION_TOKEN={verification_token}

# {NETWORK2}
{NETWORK2}_AFFILIATE_ID={affiliate_id}
{NETWORK2}_ADVERTISER_ID={advertiser_id}
{NETWORK2}_VERIFICATION_TOKEN={verification_token}
```

## Step 5: Set Verification Tokens in iScale

For each source network's advertiser, set the verification token:

```bash
PATCH https://api.eflow.team/v1/networks/patch/advertiser/apply
Header: X-Eflow-API-Key: {ISCALE_API_KEY}
{
  "network_advertiser_ids": [{advertiser_id}],
  "fields": [{"field_type": "verification_token", "field_value": "{verification_token}"}]
}
```

## Step 6: Verify Configuration

Test each API key:

```bash
# Test iScale
GET https://api.eflow.team/v1/networks/settings
Header: X-Eflow-API-Key: {ISCALE_API_KEY}

# Test each source network
GET https://api.eflow.team/v1/affiliates/settings
Header: X-Eflow-API-Key: {NETWORK_API_KEY}
```

## Step 7: Summary

Show final configuration summary:

```
✓ Configuration saved to .env.local

iScale (Destination):
  - Network ID: {ISCALE_NETWORK_ID}
  - Tracking Domain: {ISCALE_TRACKING_DOMAIN}

Source Networks:
  - {NETWORK1}: Affiliate ID {id}, Advertiser ID {id}
  - {NETWORK2}: Affiliate ID {id}, Advertiser ID {id}

You can now run:
  /sync-offer     - Sync a new offer
  /sync-links     - Update URLs for existing offer
  /sync-rules     - Update payout rules
  /sync-postbacks - Setup conversion postbacks
```

## Auto-Discovery Helpers

### Discover Affiliate ID
```bash
curl -s "https://api.eflow.team/v1/affiliates/settings" \
  -H "X-Eflow-API-Key: {api_key}" | jq '.network_affiliate_id'
```

### Discover Tracking Domain
```bash
# Temporarily make an offer public, generate link, extract domain
curl -s -X POST "https://api.eflow.team/v1/networks/tracking/offers/clicks" \
  -H "X-Eflow-API-Key: {ISCALE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"network_offer_id": 1, "network_affiliate_id": 1}' | jq -r '.url' | cut -d'/' -f3
```

### List Advertisers
```bash
curl -s "https://api.eflow.team/v1/networks/advertisers" \
  -H "X-Eflow-API-Key: {ISCALE_API_KEY}" | jq '.advertisers[] | {id: .network_advertiser_id, name: .name}'
```
