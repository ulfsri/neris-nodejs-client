import { createNerisClient } from '@api-client/client';
import { Command } from 'commander';

export const fetchEntity = (program: Command) => {
  program
    .command('fetch')
    .description('Gets an entity from NERIS')
    .argument('<entityID>', 'Entity ID')
    .action(async (entityID) => {
      if (!entityID) {
        program.error('Entity ID is required');
      }

      const client = createNerisClient();
      const { data, error } = await client.GET(`/entity/{neris_id_entity}`, {
        params: { path: { neris_id_entity: entityID } },
      });

      if (error) {
        program.error(JSON.stringify(error.detail));
      } else {
        console.log(JSON.stringify(data, null, 2));
        console.log('\n✨ Success ✨');
      }
    });
};
