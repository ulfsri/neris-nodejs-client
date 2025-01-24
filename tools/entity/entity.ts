#!/usr/bin/env tsx
import { createNerisClient } from '@api-client/client';
import { components, typeRegionValueValues } from '@api-client/neris-api.d';
import chalk from 'chalk';
import { program } from 'commander';
import 'dotenv/config';
import { readFile } from 'fs/promises';
import shp from 'shpjs';

program.name('Entity CLI tool').description('Performs common tasks on entities using the NERIS api');

program
  .command('get')
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
      console.log(chalk.dim(JSON.stringify(data, null, 2)));
      console.log(chalk.bold.green('\n✨\tSuccess\t✨ \n'));
    }
  });

program
  .command('update_geo')
  .description('Parses a shapefile and updates the geometry for an entity')
  .argument('<entityID>', 'Entity ID')
  .option('-f, --filePath <file>', 'Path to a zipfile containing the shapefile(s). e.g. /path/to/geo.zip')
  .option('-n, --name <file>', 'Name of the region set. default: The value for regionType')
  .option<components['schemas']['TypeRegionValue']>(
    '-t, --regionType <TypeRegionValue>',
    `Region type. ${typeRegionValueValues.join()}`,
    (val) => {
      if (typeRegionValueValues.indexOf(val as any) === -1) {
        throw new Error('bad region type');
      }

      return val as components['schemas']['TypeRegionValue'];
    },
    'JURISDICTION',
  )
  .action(
    async (
      entityID,
      {
        filePath,
        regionType,
        name,
      }: { filePath: string; regionType: components['schemas']['TypeRegionValue']; name: string },
    ) => {
      if (!entityID) {
        program.error('Entity ID is required');
      }
      if (!filePath) {
        program.error('Shapefile is required');
      }

      const regionName = name || regionType.toLowerCase();
      const zipData = await readFile(filePath);
      const geojson = await shp(zipData);
      const geojsonArray = Array.isArray(geojson) ? geojson : [geojson];

      const region_sets: components['schemas']['RegionSetPayload'][] = [
        {
          name: regionName,
          type: regionType,
          primary: false,
          coverage: false,
          juris: true,
          regions: geojsonArray.reduce(
            (acc: components['schemas']['RegionPayload'][], featureCollection) => {
              featureCollection.features.forEach((f) => {
                const baseProps = {
                  crs: 4326,
                  name: regionName,
                  internal_id: regionName,
                };

                switch (f.geometry.type) {
                  case 'Polygon':
                    // the api only accepts MultiPolygon so convert the polygon.
                    acc.push({
                      ...baseProps,
                      geometry: {
                        type: 'MultiPolygon',
                        coordinates: [f.geometry.coordinates],
                      },
                    });
                    break;

                  case 'MultiPolygon':
                    acc.push({
                      ...baseProps,
                      geometry: {
                        type: 'MultiPolygon',
                        coordinates: f.geometry.coordinates,
                      },
                    });
                    break;
                }
              });

              return acc;
            },
            [] as components['schemas']['RegionPayload'][],
          ),
        },
      ];

      const client = createNerisClient();
      const resGet = await client.GET(`/entity/{neris_id_entity}`, {
        params: { path: { neris_id_entity: entityID } },
      });

      if (resGet.error) {
        program.error(JSON.stringify(resGet.error.detail));
      }

      // entity returns two different responses, but they do not match and there is no _type annotation
      // so we have to guess and coerce this.
      const dept = resGet.data as components['schemas']['DepartmentResponse'];
      const existingRegionSets = dept.region_sets || [];

      // PATCH /entity uses region_sets and overwrites the old values.
      // To avoid data loss, the existing ones need to be pushed back to the API.
      existingRegionSets.forEach((s) => {
        const alreadyInUpdate = region_sets.findIndex((r) => r.name === s.name) !== -1;

        if (!alreadyInUpdate) {
          // why any?
          // RegionSetResponse.type is a string, but RegionSetPayload.type is an string enum.
          region_sets.push(s as any);
        }
      });

      const resPatch = await client.PATCH(`/entity/{neris_id_entity}`, {
        params: { path: { neris_id_entity: entityID } },
        body: {
          region_sets,
        },
      });

      if (resPatch.error) {
        program.error(JSON.stringify(resPatch.error.detail));
      }

      console.log(chalk.dim(JSON.stringify(region_sets, null, 2)));
      console.log(chalk.bold.green('\n✨\tSuccess\t✨ \n'));
    },
  );

program.parse();
