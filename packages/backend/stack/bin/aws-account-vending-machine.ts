#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AwsAccountVendingMachine } from '../lib/aws-account-vending-machine';

const app = new cdk.App();

new AwsAccountVendingMachine(app, {
  managementAccount: {
    accountId: '111111111111',
    region: 'us-east-1',
    instanceArn: 'arn:aws:sso:::instance/ssoins-1234567890',
    permissionSetArn:
      'arn:aws:sso:::permissionSet/ssoins-1234567890/ps-99999999999999',
  },
  deploymentAccount: {
    accountId: '222222222222',
    region: 'us-east-1',
  },
  application: {
    metadataUrl:
      'https://portal.sso.us-east-1.amazonaws.com/saml/metadata/ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  },
  identity: {
    callbackUrls: ['http://localhost:5173'],
    domainPrefix: 'my-vending-machine',
  },
  awsNuke: {
    blockList: ['111111111111', '222222222222', '333333333333'],
    regions: ['us-east-1'],
  },
});
