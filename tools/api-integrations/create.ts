#!/usr/bin/env tsx
import { createNerisClient } from '@api-client/client';
import chalk from 'chalk';
import 'dotenv/config';

const [_, scriptName, ownerID, integrationName] = process.argv;

const usageMsg = `
Usage:
${scriptName} [Vendor Entity ID] [integrationName]

Example:
${scriptName} VN00000000 "My Integration"`;

if (!ownerID) {
  console.log(chalk.bold.red('\n⚠️\tOwner entity is required. This is typically a vendor id.\t⚠️\n'));
  console.error(usageMsg);
  process.exit(1);
}

if (!integrationName) {
  console.log(chalk.bold.red('\n⚠️\tIntegration name is required\t⚠️\n'));
  console.error(usageMsg);
  process.exit(1);
}

const client = createNerisClient();
const { data, error } = await client.POST(`/account/integration/{entity_id}`, {
  params: { path: { entity_id: ownerID } },
  body: { title: integrationName },
});

if (error) {
  console.log(chalk.dim(error.detail));
  console.log(chalk.bold.red('\n⚠️\tError\t⚠️ \n'));
} else {
  console.log(chalk.dim(JSON.stringify(data, null, 2)));
  console.log(chalk.bold.green('\n✨\tSuccess\t✨\n'));
}
