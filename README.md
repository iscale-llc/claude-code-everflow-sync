# Everflow Offer Sync

Sync offers between Everflow accounts using Claude Code slash commands.

Pull offer data from affiliate networks and push to your own Everflow network - including URLs, creatives, geo targeting, custom payout rules, and postback pixels.

## Quick Start

1. **Clone the repo**
   ```bash
   git clone https://github.com/iscale-llc/claude-code-everflow-sync.git
   cd claude-code-everflow-sync
   ```

2. **Start Claude Code**
   ```bash
   claude
   ```

3. **Run setup wizard**
   ```
   /setup
   ```

   The wizard will guide you through:
   - Adding your destination network API key
   - Auto-discovering your network ID and tracking domain
   - Adding source network(s) with API keys
   - Configuring advertiser verification tokens

4. **Sync your first offer**
   ```
   /sync-offer
   ```

## Prerequisites

- [Claude Code](https://claude.ai/claude-code) CLI installed
- Everflow API keys:
  - **Network API key** for destination (where offers are created)
  - **Affiliate API key** for each source (where offers are pulled from)

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Initial setup wizard - run this first! |
| `/sync-offer` | Full offer sync (all data, creatives, URLs, geo, payouts, postbacks) |
| `/sync-links` | Sync only landing page URLs for existing offers |
| `/sync-rules` | Sync only custom payout rules for existing offers |
| `/sync-postbacks` | Setup postback pixels in source network |

### When to use each

- **First time?** → `/setup`
- **New offer?** → `/sync-offer`
- **URLs changed?** → `/sync-links`
- **Payouts changed?** → `/sync-rules`
- **Postbacks missing?** → `/sync-postbacks`

## What Gets Synced

| Component | /sync-offer | /sync-links | /sync-rules | /sync-postbacks |
|-----------|:-----------:|:-----------:|:-----------:|:---------------:|
| Basic info (name, description) | ✓ | | | |
| Thumbnail | ✓ | | | |
| Payout events | ✓ | | | |
| Landing page URLs | ✓ | ✓ | | |
| Creatives | ✓ | | | |
| Geo targeting | ✓ | | | |
| Custom payout rules | ✓ | | ✓ | |
| Postback pixels | ✓ | | | ✓ |

## Configuration

After running `/setup`, your `.env.local` will contain:

```bash
# API Keys
ISCALE_API_KEY=xxx                    # Destination network
ACME_API_KEY=xxx                      # Source network (example)

# Destination Configuration (auto-discovered by /setup)
ISCALE_NETWORK_ID=xxx
ISCALE_TRACKING_DOMAIN=xxx

# Per-Source-Network Configuration
ACME_AFFILIATE_ID=xxx                 # Your affiliate ID in source
ACME_ADVERTISER_ID=xxx                # Advertiser ID in destination
ACME_VERIFICATION_TOKEN=xxx           # For postback authentication
```

## Directory Structure

Synced offer data is stored locally (gitignored):

```
offers/
  {source_network}/
    {offer_id}/
      offer.json           # Full offer data from source
      url_mapping.json     # URL name → destination mapping
      creatives/           # Downloaded images
      iscale_offer_id.txt  # Corresponding ID in destination
```

## Getting API Keys

### Network API Key (Destination)
1. Log into your Everflow **network** account
2. Go to **Settings** → **API Keys**
3. Copy your network API key

### Affiliate API Key (Source)
1. Log into Everflow as an **affiliate**
2. Go to **Settings** → **API Keys**
3. Copy your affiliate API key

## How It Works

### URL Tracking
When syncing URLs, destinations include tracking parameters for attribution:
```
{landing_page}?uid={source_url_id}&oid={source_offer_id}&affid={your_affiliate_id}&sub5={transaction_id}
```
This ensures conversions can be attributed back to the source network.

### Postback Flow
1. User clicks your tracking link → redirected to landing page with `sub5={transaction_id}`
2. Conversion fires in source network
3. Source network fires postback to your network with the transaction ID
4. Your network records the conversion

## Notes

- Geo targeting may show `null` in API responses but still works
- Can't DELETE offer URLs via API - they get marked as `deleted` status
- Custom payout rules require specific URL IDs - sync URLs first

## Support

Built by Jason Akatiff - jasona@iscale.com or @jasonakatiff on Telegram

## License

MIT
