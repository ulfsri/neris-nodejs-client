#!/usr/bin/env tsx
import { program } from 'commander';
import 'dotenv/config';
import { fetchEntity } from './fetch';
import { removeRegion, upsertRegion } from './region';

program.name('Entity CLI tool').description('Performs common tasks on entities using the NERIS api');

fetchEntity(program);
upsertRegion(program);
removeRegion(program);

program.parse();
