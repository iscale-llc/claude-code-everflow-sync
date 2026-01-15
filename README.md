# Everflow Offer Sync

Sync offers between Everflow accounts using Claude Code slash commands.

Pull offer data from affiliate networks and push to your own Everflow network - including URLs, creatives, geo targeting, and custom payout rules.

## Prerequisites

- [Claude Code](https://claude.ai/claude-code) CLI installed
- Everflow API keys for source (affiliate) and destination (network) accounts

## Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/iscale-llc/claude-code-everflow-sync.git
   cd claude-code-everflow-sync
   ```

2. **Create your environment file**
   ```bash
   cp .env.example .env.local
   ```

3. **Add your API keys to `.env.local`**
   ```bash
   ISCALE_API_KEY=your_network_api_key        # destination network
   TRIMRX_API_KEY=your_affiliate_api_key      # source network 1
   DIRECTMEDS_API_KEY=your_affiliate_api_key  # source network 2
   # add more as needed
   ```

4. **Start Claude Code in the project directory**
   ```bash
   claude
   ```

## Commands

| Command | Description |
|---------|-------------|
| `/sync-offer` | Full offer sync - all data, creatives, URLs, geo targeting, payout rules |
| `/sync-links` | Sync only landing page URLs for existing offers |
| `/sync-rules` | Sync only custom payout rules for existing offers |

### When to use each

- **New offer?** → `/sync-offer`
- **URLs changed?** → `/sync-links`
- **Payouts changed?** → `/sync-rules`

## Usage

### Sync a new offer

1. Run `/sync-offer`
2. Select source network (e.g., TrimRX)
3. Select offer to sync
4. Choose "Create new offer" or update existing
5. Select advertiser in destination network
6. Claude syncs everything automatically

### Sync updated URLs

1. Run `/sync-links`
2. Select source network
3. Select offer (must already be synced)
4. Claude compares and updates URLs

### Sync payout rules

1. Run `/sync-rules`
2. Select source network
3. Select offer (must already be synced)
4. Claude compares and updates custom payout rules

## What Gets Synced

| Component | /sync-offer | /sync-links | /sync-rules |
|-----------|:-----------:|:-----------:|:-----------:|
| Basic info (name, description) | ✓ | | |
| Thumbnail | ✓ | | |
| Payout events | ✓ | | |
| Landing page URLs | ✓ | ✓ | |
| Creatives | ✓ | | |
| Geo targeting | ✓ | | |
| Custom payout rules | ✓ | | ✓ |

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

## API Keys

### Getting your Everflow API keys

1. Log into your Everflow account
2. Go to **Settings** → **API Keys**
3. Create or copy your API key

You need:
- **Network API key** for your destination account (where offers are created)
- **Affiliate API key** for each source account (where offers are pulled from)

## Notes

- Geo targeting may show `null` in API responses but still works
- Can't DELETE offer URLs via API - they get marked as `deleted` status
- Custom payout rules require specific URL IDs - sync URLs first
- Thumbnail uploads occasionally fail via API - may need manual upload

## License

MIT
