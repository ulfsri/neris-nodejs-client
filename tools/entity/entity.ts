#!/usr/bin/env tsx
import { createNerisClient } from '@api-client/client';
import chalk from 'chalk';
import 'dotenv/config';

const [_, scriptName, neris_id_entity] = process.argv;

const usageMsg = `
Usage:
${scriptName} [Entity ID]

Example:
${scriptName} FD24027077`;

if (!neris_id_entity) {
  console.log(chalk.bold.red('\n⚠️\tEntity ID is required\t⚠️ \n'));
  console.error(usageMsg);
  process.exit(1);
}

const client = createNerisClient();
const { data, error } = await client.GET(`/entity/{neris_id_entity}`, {
  params: { path: { neris_id_entity } },
});

if (error) {
  console.log(chalk.dim(error.detail));
  console.log(chalk.bold.red('\n⚠️\tError\t⚠️\n'));
} else {
  console.log(chalk.dim(JSON.stringify(data, null, 2)));
  console.log(chalk.bold.green('\n✨\tSuccess\t✨ \n'));
}
