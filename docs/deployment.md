# Deployment Guide

This template is configured for automatic deployment to Arweave using permaweb-deploy and GitHub Actions.

## Prerequisites

Before you can deploy, you'll need:

1. An Arweave wallet with:
   - Sufficient [Turbo Credits](https://docs.ardrive.io/docs/turbo/what-is-turbo.html) for deployment (purchase at [turbo-topup.com](https://turbo-topup.com/))
   - Owner or controller access to your target ArNS name

2. Your ArNS name's ANT process ID (found on [arns.app](https://arns.app/#/manage/names))

## Setup GitHub Secrets

You'll need to set up two required GitHub secrets in your repository:

1. `DEPLOY_KEY`: Your base64-encoded Arweave wallet keyfile
   - To convert your wallet file to base64:
     - On Mac: `base64 wallet.json | pbcopy`
     - On Linux: `base64 wallet.json | xclip -selection clipboard`
     - On Windows: `base64 wallet.json | clip`

2. `DEPLOY_ANT_PROCESS_ID`: Your ArNS name's ANT process ID
   - Go to [arns.app/#/manage/names](https://arns.app/#/manage/names)
   - Connect your wallet that owns or controls the ArNS name
   - Find your ArNS name in the list
   - The process ID will be displayed with your name details

Optional secret:

3. `DEPLOY_UNDERNAME`: If you want to deploy to an undername of your ArNS name, set this secret to the desired undername

To add these secrets:
1. Go to your [repository's secrets settings](../../../settings/secrets/actions)
2. Click "New repository secret"
3. Add the secrets with their respective values

## Deployment

Once the secrets are set up, deployment is automatic:
- Every push to the `main` branch will trigger a deployment
- The app will be built and deployed to Arweave
- Your ArNS name will be updated to point to the new deployment

For manual deployments or troubleshooting, please refer to the [permaweb-deploy documentation](https://github.com/ArweaveTeam/permaweb-deploy).

## Additional Resources

- [AR.IO Deployment Guide](https://docs.ar.io/guides/perma-deploy/index.html) - Official AR.IO documentation for permaweb deployment
- [permaweb-deploy Repository](https://github.com/permaweb/permaweb-deploy) - Source code and documentation for the deployment tool
- [ArDrive Documentation](https://docs.ardrive.io/) - Comprehensive guide to ArDrive and its ecosystem
- [Turbo Documentation](https://docs.ardrive.io/docs/turbo/what-is-turbo.html) - Learn more about Turbo Credits and how they work
